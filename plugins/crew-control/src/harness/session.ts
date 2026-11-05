import type { ChildProcess } from 'node:child_process';
import type { Run } from '../contract/index.js';
import type { Store } from '../store/index.js';
import type { ActivityTracker } from './stream.js';

export class HarnessError extends Error {
  constructor(public code: string, message: string, public status = 409, public details?: Record<string, unknown>) {
    super(message);
  }
}

export interface HarnessOptions {
  store: Store;
  /** Alamat server ini yang bisa dijangkau claude (untuk hook), mis. http://127.0.0.1:4780 */
  hookBaseUrl: string;
  bin?: string; // default "claude"
  binArgs?: string[]; // argumen sebelum argumen claude (dipakai tes dengan claude tiruan)
  maxRuns?: number;
  stopSoftMs?: number; // setelah Stop: tutup stdin bila claude belum berhenti
  stopKillMs?: number; // setelah Stop: matikan paksa seluruh pohon proses
  pauseDetachMs?: number; // Jeda lebih lama dari ini: proses ditutup, sesi terlepas (bawaan 50 mnt, ARCHITECTURE 7.E)
  clock?: Clock; // jam untuk batas Jeda; tes memakai jam tiruan
}

export interface Clock { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(h: unknown): void }

export interface Live {
  run: Run;
  child: ChildProcess;
  key: string;
  token: string;
  paused: boolean;
  stopRequested: boolean;
  disconnect: boolean;
  exited: boolean;
  waiters: (() => void)[]; // hook PreToolUse yang ditahan karena Jeda
  pending: Map<string, { requestId: string; input: unknown }>; // messageId -> permintaan claude yang menunggu
  queued: { messageId: string; text: string }[]; // pesan pemilik saat Jeda
  lastResult?: Record<string, any>;
  stopTimers: NodeJS.Timeout[];
  stderrTail: string;
  seq: number;
  tracker: ActivityTracker; // status agent live dari stream sesi ini
  detachTimer?: unknown; // batas Jeda berjalan
  detaching?: boolean; // Jeda terlalu lama: proses sedang ditutup, run tetap paused
  limit?: { resetAt: string | null }; // galat batas pemakaian terlihat di stream: finalize menahan run (limit_paused)
  resumeAfterDetach?: boolean; // Lanjut ditekan saat proses masih ditutup
}
