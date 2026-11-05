import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseAgentMd } from '../src/teams/agent-md.js';
import { createCatalog } from '../src/teams/catalog.js';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'teams');
const copy = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-teams-')); fs.cpSync(FIX, d, { recursive: true }); return d; };

test('agent-md: skalar, daftar blok, inline, dan string koma', () => {
  const a = parseAgentMd('---\nname: x\ndescription: "Peran: ya"\ntools: Read, Write\nskills: [a, b]\nmodel: opus\n---\nisi');
  assert.deepEqual(a, { id: 'x', name: 'x', role: 'Peran: ya', model: 'opus', skills: ['a', 'b'], tools: ['Read', 'Write'] });
  assert.deepEqual(parseAgentMd('---\nname: y\ndescription: d\nskills:\n  - s1\n  - s2\n---').skills, ['s1', 's2']);
});

test('agent-md: galat menyebut bagian', () => {
  assert.throws(() => parseAgentMd('tanpa frontmatter'), { section: 'frontmatter' });
  assert.throws(() => parseAgentMd('---\ndescription: d\n---'), { section: 'name' });
  assert.throws(() => parseAgentMd('---\nname: z\n---'), { section: 'description' });
});

test('katalog: tim tiruan muncul tanpa kode; agent baru muncul tanpa ubah kode; tim rusak terisolasi', () => {
  const d = copy();
  const c = createCatalog([d]);
  const tiruan = c.get('tiruan')!;
  assert.equal(tiruan.valid, true);
  assert.deepEqual(tiruan.agents.map((a) => a.id), ['tiruan-agent']);
  assert.equal(c.agentOf(tiruan, 'tiruan-agent')!.model, 'haiku');
  fs.writeFileSync(path.join(d, 'tiruan', 'agents', 'baru.md'), '---\nname: baru\ndescription: Agent baru\n---\n');
  assert.deepEqual(c.get('tiruan')!.agents.map((a) => a.id).sort(), ['baru', 'tiruan-agent']);
  const rusak = c.list().find((t) => t.id === 'rusak')!;
  assert.equal(rusak.valid, false);
  assert.match(rusak.error!.file, /team\.json$/);
  assert.equal(rusak.error!.section, 'commands.0.template');
  assert.equal(c.list().find((t) => t.id === 'tiruan')!.valid, true);
  assert.equal(c.get('tidak-ada'), null);
});

test('katalog: agent .md rusak dan node alur tanpa agent -> valid:false dengan berkas dan bagian', () => {
  const d = copy();
  fs.writeFileSync(path.join(d, 'tiruan', 'agents', 'jelek.md'), '---\nname: jelek\n---\n');
  const e = createCatalog([d]).get('tiruan')!.error!;
  assert.match(e.file, /jelek\.md$/);
  assert.equal(e.section, 'description');
  fs.rmSync(path.join(d, 'tiruan', 'agents', 'jelek.md'));
  fs.rmSync(path.join(d, 'tiruan', 'agents', 'tiruan-agent.md'));
  assert.equal(createCatalog([d]).get('tiruan')!.error!.section, 'flow.nodes');
});

test('plugin Fullstack asli terbaca dari agents/*.md tanpa team.json', () => {
  const plugins = path.join(FIX, '..', '..', '..', '..');
  const t = createCatalog([plugins]).get('fullstack')!;
  assert.equal(t.valid, true, JSON.stringify(t.error));
  for (const id of ['be', 'fe', 'ui-designer', 'cyber']) assert.ok(t.agents.some((a) => a.id === id), id);
});

test('HTTP: /api/config memuat tim, perintah, defaultBatchSize; /api/teams/:id; 404', async () => {
  const { createApp } = await import('../src/server.js');
  const { Store } = await import('../src/store/index.js');
  const store = new Store(':memory:');
  const app = createApp({ store, harness: {} as never, workRoot: os.tmpdir(), maxRuns: 1, teamDirs: [FIX] });
  const get = (url: string) => app.inject({ method: 'GET', url, headers: { host: 'localhost' }, remoteAddress: '127.0.0.1' });
  const cfg = (await get('/api/config')).json();
  assert.equal(cfg.defaultBatchSize, 5);
  const tiruan = cfg.teams.find((t: { id: string }) => t.id === 'tiruan');
  assert.deepEqual(tiruan.commands.map((c: { id: string }) => c.id), ['bebas']);
  assert.equal(cfg.teams.find((t: { id: string }) => t.id === 'rusak').valid, false);
  const t = (await get('/api/teams/tiruan')).json();
  assert.equal(t.agents[0].id, 'tiruan-agent');
  assert.equal((await get('/api/teams/nope')).statusCode, 404);
  await app.close(); store.close();
});
