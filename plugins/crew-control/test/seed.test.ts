import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { RunStatus } from '../src/contract/index.js';
import { seedDemo } from '../src/seed.js';
import { Store } from '../src/store/index.js';

test('demo.db: berlabel, tiap status run, skenario tim 10 agent, bukti ada', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-seed-')), 'demo.db');
  seedDemo(file).close();
  const s = new Store(file); // dibuka ulang seperti server dengan CREW_DB
  assert.equal(s.getSetting('demo_label'), 'Data contoh');
  const runs = s.listRuns(undefined, 1000);
  assert.deepEqual([...new Set(runs.map((r) => r.status))].sort(), [...RunStatus.options].sort());
  const sb = runs.find((r) => r.id.startsWith('ced3b44a'))!;
  assert.equal(sb.status, 'stopped');
  assert.ok((sb.tokens?.output ?? 0) > 0, 'token dari transkrip');
  assert.equal(s.listMessages(sb.id).filter((m) => m.state === 'pending').length, 0);
  const tc = runs.find((r) => r.projectName === 'toconnect')!;
  const act = s.listActivities(tc.id);
  assert.equal(act.filter((a) => a.status === 'running').length, 3); // fe + be paralel, ui-designer menunggu pertanyaan
  assert.equal(new Set(act.map((a) => a.agent)).size, 7); // 3 sisanya Siap (tanpa aktivitas)
  assert.equal(s.listMessages(tc.id).filter((m) => m.kind === 'question' && m.state === 'pending').length, 1);
  assert.equal(s.listBatches(tc.id).length, 2);
  const tcItems = s.listItems(s.listProjects().find((p) => p.name === 'toconnect')!.id);
  assert.deepEqual([tcItems.filter((i) => i.status === 'done').length, tcItems.length], [7, 24]);
  const cc = s.listProjects().find((p) => p.name === 'crew-control')!;
  assert.ok(s.listEvidence(cc.id).length >= 7);
  s.close();
});
