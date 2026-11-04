const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { open } = require('../../server/store.js');

const row = (id, project, o = {}) => ({ id, project, flow: 'free', title: 't', prompt: 'p', started_at: id, updated_at: id, finished: 1, tokens_eq: 100, tokens_raw: 100, agents_ran: 0, files: 0, state: '{}', convo: '[]', ...o });

for (const kind of ['sqlite', 'json']) {
  const mk = () => {
    if (kind === 'json') process.env.FLOW_VIEWER_STORE = 'json'; else delete process.env.FLOW_VIEWER_STORE;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-store-'));
    const s = open(dir);
    assert.strictEqual(s.kind, kind);
    return s;
  };
  test(`${kind}: 201 run proyek A -> A tinggal 200 (terlama hilang), B utuh`, () => {
    const s = mk();
    s.save(row(5, 'B'));
    for (let i = 1000; i < 1201; i++) s.save(row(i, 'A'));
    const a = s.list('A', 1000);
    assert.strictEqual(a.length, 200);
    assert.strictEqual(s.get(1000), null);
    assert.ok(s.get(1001));
    assert.ok(s.get(5), 'run proyek B tidak boleh tersentuh');
    assert.strictEqual(s.list('B', 10).length, 1);
  });
  test(`${kind}: tanpa batas total lintas proyek`, () => {
    const s = mk();
    for (let p = 0; p < 6; p++) for (let i = 0; i < 200; i++) s.save(row(p * 10000 + i + 1, 'P' + p));
    assert.strictEqual(s.projects().reduce((n, x) => n + x.count, 0), 1200);
  });
  test(`${kind}: projects() hitung dan terbaru per proyek`, () => {
    const s = mk();
    s.save(row(10, 'A')); s.save(row(20, 'A')); s.save(row(15, 'B'));
    const ps = s.projects();
    assert.deepStrictEqual(ps.map((x) => [x.project, x.count, x.last_at]), [['A', 2, 20], ['B', 1, 15]]);
  });
  test(`${kind}: previous() = run terbaru proyek+flow sebelum beforeId, tokens_eq>0, kecocokan agent`, () => {
    const s = mk();
    s.save(row(1, 'A', { flow: 'build', tokens_eq: 50 }));
    s.save(row(2, 'A', { flow: 'build', tokens_eq: 0 }));
    s.save(row(3, 'A', { flow: 'build', tokens_eq: 70 }));
    s.save(row(4, 'A', { flow: 'other', tokens_eq: 90 }));
    s.save(row(5, 'B', { flow: 'build', tokens_eq: 99 }));
    s.save(row(6, 'A', { flow: 'build', tokens_eq: 80 }));
    assert.strictEqual(s.previous('A', 'build', 6, false).id, 3);
    assert.strictEqual(s.previous('A', 'build', 3, false).id, 1);
    assert.strictEqual(s.previous('A', 'build', 1, false), null);
    assert.strictEqual(s.previous('Z', 'build', 99, false), null);
    // flow free: tanya-jawab (tanpa agent) tidak dibandingkan dengan run beragen
    s.save(row(10, 'A', { flow: 'free', agents_ran: 3 }));
    s.save(row(11, 'A', { flow: 'free', agents_ran: 0 }));
    assert.strictEqual(s.previous('A', 'free', 99, true).id, 10);
    assert.strictEqual(s.previous('A', 'free', 99, false).id, 11);
    assert.strictEqual(s.previous('A', 'build', 99, true).id, 6, 'withAgents hanya membedakan flow free');
  });
  test(`${kind}: remove run berjalan ditolak, selain itu terhapus`, () => {
    const s = mk();
    s.save(row(1, 'A')); s.save(row(2, 'A'));
    assert.strictEqual(s.remove(2, [2]), false);
    assert.ok(s.get(2));
    assert.strictEqual(s.remove(1, [2]), true);
    assert.strictEqual(s.get(1), null);
  });
  test(`${kind}: nextId monoton walau jam mundur`, () => {
    const s = mk();
    const far = Date.now() + 1e7;
    s.save(row(far, 'A'));
    assert.strictEqual(s.nextId(), far + 1);
    assert.ok(s.nextId() >= Date.now());
  });
}
