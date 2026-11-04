// Logika murni tampilan (tanpa DOM) supaya bisa dites. Bentuk data: src/contract.ts.

export const STATUS_LABEL = {
  running: 'Jalan', needs_owner: 'Butuh kamu', paused: 'Dijeda', limit_paused: 'Jeda limit', ready_review: 'Siap review',
  done: 'Selesai', failed: 'Gagal', stopped: 'Dihentikan', disconnected: 'Terputus',
};
export const TERMINAL = ['stopped', 'failed', 'done', 'disconnected'];

export const emptyState = () => ({ run: null, messages: [], tools: [] });

/** Terapkan satu event SSE ke state. message: ganti per id (event bisa berupa pembaruan), selain itu tambah. */
export function applyEvent(state, type, data) {
  if (type === 'run') return { ...state, run: data };
  if (type === 'tool') return { ...state, tools: [...state.tools, data] };
  if (type === 'message') {
    const i = state.messages.findIndex((m) => m.id === data.id);
    const messages = i >= 0 ? state.messages.map((m, j) => (j === i ? data : m)) : [...state.messages, data];
    return { ...state, messages };
  }
  return state;
}

/**
 * Aksi yang boleh pada status ini. Run berakhir yang punya sesi tetap bisa dilanjutkan lewat pesan
 * (chat berkelanjutan); tanpa sesi (gagal sebelum mulai) tidak bisa.
 */
/** @param {string} status @param {string | null} [sessionId] */
export function allowedActions(status, sessionId = null) {
  if (TERMINAL.includes(status)) return { pause: false, resume: false, stop: false, message: !!sessionId };
  return { pause: status !== 'paused', resume: status === 'paused', stop: true, message: true };
}

/** Enter mengirim, Shift+Enter baris baru; Enter saat komposisi IME (isComposing) tidak mengirim. */
export const isSendKey = (e) => e.key === 'Enter' && !e.shiftKey && !e.isComposing;

/**
 * Susun badan jawaban pertanyaan. picks: { [teks pertanyaan]: string[] } dari tombol; typed: { [teks]: string } ketikan bebas.
 * Ketikan bebas menang atas pilihan. Mengembalikan { answers } atau { missing: [teks pertanyaan belum terjawab] }.
 */
export function buildQuestionAnswer(questions, picks, typed) {
  const answers = {};
  const missing = [];
  for (const q of questions) {
    const t = (typed[q.question] ?? '').trim();
    const p = picks[q.question] ?? [];
    if (t) answers[q.question] = t;
    else if (p.length) answers[q.question] = q.multiSelect ? p : p[0];
    else missing.push(q.question);
  }
  return missing.length ? { missing } : { answers: { kind: 'question', answers } };
}

/** Ringkas jawaban tersimpan jadi teks untuk riwayat Chat. */
export function describeAnswer(m) {
  const a = m.answer;
  if (!a) return '';
  const who = { dashboard: 'kamu', agent: 'agent membatalkan', system: 'run berakhir' }[a.from] ?? a.from;
  if (m.state === 'cancelled') return `Dibatalkan (${who})`;
  if (a.decision) return `${a.decision === 'allow' ? 'Disetujui' : 'Ditolak'}${a.reason ? `: ${a.reason}` : ''}`;
  return Object.entries(a.answers ?? {}).map(([q, v]) => `${q} → ${v}`).join('; ');
}
