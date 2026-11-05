// Conductor: arti sebuah run di atas Harness (satu proses claude). Bagian ini: penerimaan run (satu run aktif per proyek,
// kapasitas CREW_MAX_RUNS) dan transisi status tanpa sesi. Alur batch/milestone/limit menyusul (FreeFlow/BacklogFlow).
import { TERMINAL_STATUSES, type Message, type Run, type RunStatus } from '../contract/index.js';
import { HarnessError, type Harness } from '../harness/index.js';
import { projectKey } from '../projects.js';
import type { Store } from '../store/index.js';
import { canTransition, usesCapacity } from './status.js';

export { HarnessError as ConductorError } from '../harness/index.js'; // satu kelas galat: server memetakannya ke format galat API
export { canTransition, liveStatus, usesCapacity } from './status.js';

export class Conductor {
  constructor(private o: { store: Store; harness: Harness; maxRuns: number }) {
    if (!Number.isInteger(o.maxRuns) || o.maxRuns < 1 || o.maxRuns > 3) throw new RangeError('CREW_MAX_RUNS harus 1..3.');
  }

  /** projectDir harus sudah divalidasi (resolveProject). */
  start(spec: { projectDir: string; prompt: string; model?: string }): Run {
    this.admit(spec.projectDir, null);
    return this.o.harness.startRun(spec);
  }

  /** Pesan pemilik. Run done terakhir dilanjutkan (sesi sama) hanya bila proyek bebas dan kapasitas ada. */
  chat(runId: string, text: string): Message {
    const run = this.o.store.getRun(runId);
    if (run?.origin === 'desktop') throw new HarnessError('desktop_no_prompt', 'Sesi desktop hanya bisa dihentikan dari sini.', 409);
    if (run && TERMINAL_STATUSES.includes(run.status) && this.o.harness.activeRunId(run.project) !== runId) this.admit(run.project, runId);
    return this.o.harness.sendMessage(runId, text);
  }

  /** Lanjutkan run failed/disconnected: admission sama dengan chat. */
  continue(runId: string): Run {
    const run = this.o.store.getRun(runId);
    if (run && ['failed', 'disconnected'].includes(run.status) && run.origin !== 'desktop' && this.o.harness.activeRunId(run.project) !== runId) this.admit(run.project, runId);
    return this.o.harness.continueFailed(runId);
  }

  /** Run aktif di proyek ini (proses hidup, atau tertahan di data: needs_owner/limit_paused/ready_review), atau null. */
  activeRunId(projectDir: string): string | null {
    return this.o.harness.activeRunId(projectDir) ?? this.dashboardActive().find((r) => projectKey(r.project) === projectKey(projectDir))?.id ?? null;
  }

  /** Transisi tanpa proses (limit, review, keputusan). Perubahan dicatat Store sebagai event `status`. */
  transition(runId: string, to: RunStatus, reason: string | null): Run {
    const run = this.o.store.getRun(runId);
    if (!run) throw new HarnessError('not_found', 'Run tidak ditemukan.', 404);
    if (!canTransition(run.status, to)) {
      throw new HarnessError('invalid_transition', `Status run tidak bisa berubah dari ${run.status} ke ${to}.`, 409, { from: run.status, to });
    }
    const end = TERMINAL_STATUSES.includes(to);
    const endedAt = end ? new Date().toISOString() : null;
    const next: Run = { ...run, status: to, reason, endedAt, durationMs: endedAt ? Date.parse(endedAt) - Date.parse(run.startedAt) : null };
    this.o.store.saveRun(next);
    return next;
  }

  private dashboardActive(): Run[] {
    return this.o.store.listActiveRuns().filter((a) => a.origin !== 'desktop').map((a) => a.run);
  }

  /** Data (cek DB) + memori Harness; run `except` (yang dilanjutkan) tidak dihitung. */
  private admit(projectDir: string, except: string | null) {
    const active = this.dashboardActive().filter((r) => r.id !== except);
    const busy = this.o.harness.activeRunId(projectDir) ?? active.find((r) => projectKey(r.project) === projectKey(projectDir))?.id;
    if (busy && busy !== except) throw new HarnessError('project_busy', 'Proyek ini sudah punya run aktif.', 409, { activeRunId: busy });
    const used = active.filter(usesCapacity).length;
    if (used >= this.o.maxRuns) {
      throw new HarnessError('capacity', `Sudah ada ${used} run aktif (batas ${this.o.maxRuns}).`, 409, { activeRunIds: active.filter(usesCapacity).map((r) => r.id) });
    }
  }
}
