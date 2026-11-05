import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Harness, type HarnessOptions } from '../src/harness/index.js';
import { FreeFlow } from '../src/conductor/free-flow.js';
import { Store } from '../src/store/index.js';
import type { Message, Run } from '../src/contract/index.js';

export const FAKE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fake-claude.mjs');

export async function waitFor<T>(fn: () => T | undefined | false | null, ms = 8000, what = 'kondisi'): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`Timeout menunggu ${what}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

export const tmpProject = (name = 'proj') => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-test-')));
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  return { root, dir };
};

/** Harness dengan claude tiruan + server hook HTTP kecil (seperti server asli meneruskan /hook/:token). */
export async function setupHarness(opts: Partial<HarnessOptions> = {}) {
  const store = new Store(':memory:');
  let harness!: Harness;
  const hookServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      const out = await harness.hook(req.url!.split('/').pop()!, JSON.parse(body || '{}'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });
  await new Promise<void>((r) => hookServer.listen(0, '127.0.0.1', r));
  const port = (hookServer.address() as { port: number }).port;
  harness = new Harness({
    store, hookBaseUrl: `http://127.0.0.1:${port}`, bin: process.execPath, binArgs: [FAKE],
    stopSoftMs: 3000, stopKillMs: 6000, ...opts,
  });
  new FreeFlow({ harness, graceMs: 150 });
  const close = () => { harness.shutdown(); hookServer.close(); };
  const run = (id: string): Run => store.getRun(id)!;
  const messages = (id: string): Message[] => store.listMessages(id);
  const find = (id: string, pred: (m: Message) => boolean) => messages(id).find(pred);
  return { store, harness, close, run, messages, find };
}
