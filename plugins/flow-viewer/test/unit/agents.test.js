const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const agents = require('../../server/agents');

test('be.md dari plugin ryama-kit terbaca dengan 5 skill (daftar YAML)', () => {
  const be = agents.catalogFor(null).defs.be;
  assert.deepStrictEqual(be.skills, ['security-checklists', 'project-context', 'ponytail', 'codebase-design', 'tdd']);
  assert.strictEqual(be.model, 'opus');
});

test('flows.json.agents memuat tampilan (label, peran, ikon) yang dulu ada di index.html', () => {
  const { display, crew } = agents.catalogFor(null);
  assert.strictEqual(display.be.label, 'Backend Engineer');
  assert.strictEqual(display.be.role, 'Membangun API, database, dan logika sisi server.');
  assert.match(display.be.icon, /^<ellipse cx="12" cy="5"/);
  assert.strictEqual(display.__main.label, 'Claude (Orkestrator)');
  assert.deepStrictEqual(crew, ['prd', 'architect', 'ui-designer', 'be', 'fe', 'ui-critic', 'qa', 'cyber', 'ux', 'backlog']);
});

const FLOWS = {
  free: {
    title: 'Overview',
    nodes: [{ id: 'a', role: 'langkah a', col: 1, row: 0 }, { id: 'b', col: 1, row: 1 }, { id: 'c', col: 2, row: 0 }],
    edges: [['a', 'c']],
  },
  build: { title: 'build', nodes: [{ id: 'a' }], edges: [] },
  agents: { a: { label: 'Agen A', role: 'Peran A.', icon: '<path d="A"/>' }, _def: { icon: '<path d="DEF"/>' } },
};

function agentMd(dir, file, fm) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), `---\n${fm}\n---\n\nIsi prompt.\n`);
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-agents-'));
  const pluginsDir = path.join(root, 'plugins');
  const home = path.join(root, 'home');
  const proj = path.join(root, 'proj');
  agentMd(path.join(pluginsDir, 'kit', 'agents'), 'a.md', 'name: a\ndescription: Agen a. Kalimat kedua.\nmodel: opus\nskills: [x, y]');
  agentMd(path.join(pluginsDir, 'kit', 'agents'), 'zeta.md', 'name: zeta\ndescription: "Zeta menulis dokumen. Lalu lain."');
  agentMd(path.join(home, '.claude', 'agents'), 'pribadi.md', 'name: pribadi\ndescription: Agen pribadi.');
  agentMd(path.join(proj, '.claude', 'agents'), 'baru.md', 'name: baru\ndescription: Agen baru proyek.\nskills:\n  - s1\n  - "s2"');
  fs.mkdirSync(path.join(root, 'proj2'));
  return { root, pluginsDir, home, proj, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('crew = node free + agent plugin + agent proyek; agent ~/.claude/agents tidak masuk crew', () => {
  const fx = fixture();
  try {
    const cat = agents.createAgents({ pluginsDir: fx.pluginsDir, home: fx.home, flows: FLOWS }).catalogFor(fx.proj);
    assert.deepStrictEqual(cat.crew, ['a', 'b', 'c', 'baru', 'zeta']);
    // baru: kolom 3 kosong (isi 2,1,0) -> col 3 row 0; zeta: seri kolom 2 dan 3 (1,1) -> kolom terkecil 2, baris setelah 0.
    assert.deepStrictEqual(cat.crewMeta, [
      { id: 'a', col: 1, row: 0 }, { id: 'b', col: 1, row: 1 }, { id: 'c', col: 2, row: 0 },
      { id: 'baru', col: 3, row: 0 }, { id: 'zeta', col: 2, row: 1 },
    ]);
    assert.deepStrictEqual(cat.edges, [['a', 'c']]);
    assert.deepStrictEqual(cat.defs.baru.skills, ['s1', 's2']);
    assert.ok(cat.defs.pribadi, 'agent ~/.claude/agents tetap dikenali definisinya');
    assert.ok(!cat.crew.includes('pribadi'));
  } finally { fx.cleanup(); }
});

test('tampilan dari flows.json.agents; tanpa entri: label = nama, peran = kalimat pertama description, ikon umum', () => {
  const fx = fixture();
  try {
    const { display, defs } = agents.createAgents({ pluginsDir: fx.pluginsDir, home: fx.home, flows: FLOWS }).catalogFor(fx.proj);
    assert.deepStrictEqual(display.a, { label: 'Agen A', role: 'Peran A.', icon: '<path d="A"/>' });
    assert.deepStrictEqual(display.zeta, { label: 'zeta', role: 'Zeta menulis dokumen.', icon: '<path d="DEF"/>' });
    assert.deepStrictEqual(display.b, { label: 'b', role: '', icon: '<path d="DEF"/>' }, 'node flow tanpa file tetap punya tampilan');
    assert.deepStrictEqual(display.pribadi, { label: 'pribadi', role: 'Agen pribadi.', icon: '<path d="DEF"/>' });
    assert.strictEqual(defs.b, undefined, 'defs hanya agent yang punya file');
  } finally { fx.cleanup(); }
});

test('flow(name): flow dikenal apa adanya; "agents" dan nama asing jatuh ke free yang memuat agent baru', () => {
  const fx = fixture();
  try {
    const cat = agents.createAgents({ pluginsDir: fx.pluginsDir, home: fx.home, flows: FLOWS }).catalogFor(fx.proj);
    assert.deepStrictEqual(cat.flow('build'), { name: 'build', title: 'build', nodes: [{ id: 'a' }], edges: [] });
    for (const n of ['agents', 'tidak-ada', undefined]) {
      const f = cat.flow(n);
      assert.strictEqual(f.name, 'free');
      assert.deepStrictEqual(f.nodes.map((x) => x.id), ['a', 'b', 'c', 'baru', 'zeta']);
      assert.deepStrictEqual(f.nodes[0], { id: 'a', role: 'langkah a', col: 1, row: 0 });
      assert.deepStrictEqual(f.edges, [['a', 'c']]);
    }
  } finally { fx.cleanup(); }
});

test('agent baru muncul setelah refresh (SessionStart) atau setelah 30 dtk; tanpa itu katalog dari cache', () => {
  const fx = fixture();
  let t = 1_000_000;
  try {
    const cat = agents.createAgents({ pluginsDir: fx.pluginsDir, home: fx.home, flows: FLOWS, now: () => t });
    const dir = path.join(fx.proj, '.claude', 'agents');
    assert.ok(!cat.catalogFor(fx.proj).crew.includes('kedua'));

    agentMd(dir, 'kedua.md', 'name: kedua\ndescription: Agen kedua.');
    const f = path.join(dir, 'kedua.md');
    const t0 = new Date('2026-01-01T00:00:00Z'); // mtime bulat: utimes tidak bisa memulihkan presisi sub-ms NTFS
    fs.utimesSync(f, t0, t0);
    t += 10_000;
    assert.ok(!cat.catalogFor(fx.proj).crew.includes('kedua'), 'belum 30 dtk dan tanpa refresh: dari cache');
    cat.refresh(fx.proj);
    assert.ok(cat.catalogFor(fx.proj).crew.includes('kedua'), 'refresh saat SessionStart memindai ulang');

    agentMd(dir, 'ketiga.md', 'name: ketiga\ndescription: Agen ketiga.');
    t += 31_000;
    assert.ok(cat.catalogFor(fx.proj).crew.includes('ketiga'), 'lewat 30 dtk: dipindai ulang');

    // Isi berubah tapi mtime file sama: cache mtime dipakai, file tidak diparse ulang.
    fs.writeFileSync(f, '---\nname: kedua\nmodel: haiku\n---\n');
    fs.utimesSync(f, t0, t0);
    cat.refresh(fx.proj);
    assert.strictEqual(cat.catalogFor(fx.proj).defs.kedua.model, '');
    // mtime file berubah: terbaca.
    const t1 = new Date('2026-01-02T00:00:00Z');
    fs.utimesSync(f, t1, t1);
    cat.refresh(fx.proj);
    assert.strictEqual(cat.catalogFor(fx.proj).defs.kedua.model, 'haiku');

    assert.ok(!cat.catalogFor(path.join(fx.root, 'proj2')).crew.includes('kedua'), 'katalog per proyek terpisah');
  } finally { fx.cleanup(); }
});
