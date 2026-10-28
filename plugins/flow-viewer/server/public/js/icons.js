// Nama, peran, dan ikon agent. Dipakai bila server belum mengirim label/peran/ikon (flows.json.agents).
// Ikon status dan ikon rel panel juga ada di sini.
export const DN = { prd: 'Penulis PRD', ux: 'Perancang UX', backlog: 'Pengatur Backlog', architect: 'Arsitek Sistem', 'ui-designer': 'Desainer UI', be: 'Backend Engineer', fe: 'Frontend Engineer', 'ui-critic': 'Kritikus UI', qa: 'Penguji QA', cyber: 'Auditor Keamanan', __main: 'Claude (Orkestrator)', __prompt: 'Prompt kamu' };
export const ROLE = {
  prd: 'Menulis spesifikasi produk dan kriteria penerimaan yang bisa diuji.',
  ux: 'Merancang alur pemakaian: langkah paling sedikit, pola modal atau panel, navigasi, dan state.',
  backlog: 'Menyusun urutan kerja berdependensi dan menjaga antrean tetap sesuai PRD.',
  architect: 'Merancang arsitektur dan memecah pekerjaan jadi tugas berurutan.',
  'ui-designer': 'Riset referensi, menetapkan DESIGN.md, lalu membuat mockup.',
  be: 'Membangun API, database, dan logika sisi server.',
  fe: 'Menyambungkan tampilan ke logika dan data.',
  'ui-critic': 'Menilai hasil visual dengan prinsip desain dan audit terukur.',
  qa: 'Menguji kriteria penerimaan dengan Playwright.',
  cyber: 'Memeriksa celah keamanan sebelum rilis.'
};
export const ICONS = {
  prd: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  ux: '<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M10 7h4a3 3 0 0 1 3 3v4"/>',
  backlog: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>',
  architect: '<path d="m12 3-9 5 9 5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  'ui-designer': '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.2-1.6-.4-1 .2-2.4 1.6-2.4H17a4 4 0 0 0 4-4c0-5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="8" r="1"/>',
  be: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  fe: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  'ui-critic': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  qa: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  cyber: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  __main: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  __prompt: '<path d="M4 5h16v11H9l-5 4z"/>',
  __all: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  _def: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'
};

export const STATUS_ICON = {
  done: '<path d="m5 12 4 4 10-10"/>',
  running: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
  input: '<path d="M12 8v5M12 17h.01"/>',
  failed: '<path d="M6 6l12 12M18 6 6 18"/>',
  skipped: '<path d="M6 12h12"/>',
  idle: '',
  optional: '',
};
export const STATUS_TEXT = {
  idle: 'menunggu', running: 'berjalan', done: 'selesai', skipped: 'dilewati', optional: 'opsional', input: 'tanya kamu', failed: 'gagal',
};
export const STATUS_GLYPH = { idle: '○', running: '●', done: '✓', skipped: '–', optional: '○', input: '?', failed: '✕' };

export const RAIL_ICON = {
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  backlog: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  files: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  skill: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11"/>',
  token: '<path d="M4 17a8 8 0 1116 0M12 17l4-6"/>',
  agent: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  log: '<path d="M4 6h16M4 12h10M4 18h13"/>',
  model: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  tool: '<path d="M14 6l4 4-9 9H5v-4zM13 7l4 4"/>',
};

// Warna per peran agent (bukan ungu; sengaja dibuat berbeda agar mudah dikenali sekilas).
export const ROLE_COLOR = {
  __prompt: '#78716c', __main: '#0f766e', prd: '#b45309', ux: '#0891b2', backlog: '#d97706', architect: '#0e7490',
  'ui-designer': '#db2777', be: '#15803d', fe: '#2563eb', 'ui-critic': '#ea580c', qa: '#4d7c0f', cyber: '#dc2626',
};
const FALLBACK = ['#0891b2', '#b45309', '#15803d', '#2563eb', '#db2777', '#ea580c', '#0e7490', '#4d7c0f'];
export function colorOf(id) {
  if (ROLE_COLOR[id]) return ROLE_COLOR[id];
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

// Info tampilan satu agent: server (crewMeta) menang atas tabel bawaan.
export function metaOf(id, S) {
  const m = ((S && S.crewMeta) || []).find((x) => x.id === id) || {};
  const n = (S && S.nodes && S.nodes[id]) || {};
  return {
    label: m.label || DN[id] || id,
    role: m.role || n.role || ROLE[id] || '',
    icon: m.icon || ICONS[id] || ICONS._def,
  };
}
