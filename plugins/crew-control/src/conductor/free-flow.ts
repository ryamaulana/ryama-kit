// FreeFlow: alur prompt bebas / perintah sesi. Merender template perintah tim, meluncurkan sesi lewat Harness, dan
// memutuskan "giliran selesai = run selesai": tidak ada pesan baru dalam graceMs setelah `result` -> sesi ditutup -> run done.
import type { Run, TeamCommand } from '../contract/index.js';
import { HarnessError, type Harness } from '../harness/index.js';

/** Isi placeholder satu kali jalan (teks pemilik yang memuat "{x}" tidak diperluas lagi). Placeholder lain kosong. */
export function renderTemplate(template: string, vars: { prompt: string }): string {
  return template.replace(/\{([^{}]*)\}/g, (_m, k: string) => (k === 'prompt' ? vars.prompt : '')).trim();
}

export class FreeFlow {
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(private o: { harness: Harness; graceMs?: number }) {
    o.harness.onTurn = (runId, ev) => {
      clearTimeout(this.timers.get(runId));
      this.timers.delete(runId);
      if (ev !== 'result') return;
      const t = setTimeout(() => { this.timers.delete(runId); this.o.harness.closeSession(runId); }, this.o.graceMs ?? 2000);
      t.unref();
      this.timers.set(runId, t);
    };
  }

  /** projectDir sudah divalidasi (resolveProject); cmd dari TeamCatalog.command (pemanggil menjawab 400 command_not_found bila tidak ada). */
  start(spec: { projectDir: string; command: TeamCommand; prompt: string; model?: string }): Run {
    const cmd = spec.command;
    if (cmd.kind !== 'session') throw new HarnessError('invalid_request', 'Perintah ini bukan perintah sesi.', 400);
    const prompt = spec.prompt.trim();
    if (cmd.needsText && !prompt) throw new HarnessError('command_needs_text', 'Perintah ini perlu teks.', 400);
    return this.o.harness.startRun({ projectDir: spec.projectDir, prompt: renderTemplate(cmd.template, { prompt }), model: spec.model });
  }
}
