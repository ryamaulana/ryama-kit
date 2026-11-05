// Penyajian web/dist lewat server: halaman, aset, rute klien, dan penolakan path lain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Harness } from '../src/harness/index.js';
import { createApp } from '../src/server.js';
import { Store } from '../src/store/index.js';
import { FAKE, tmpProject } from './helpers.js';

test('server melayani web/dist di akar, rute klien jatuh ke index.html, path lain dan API tak dikenal 404', async (t) => {
  const { root } = tmpProject('app');
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html lang="id"><title>x</title>');
  fs.writeFileSync(path.join(dist, 'assets', 'a.js'), 'export {}');
  const store = new Store(':memory:');
  const harness = new Harness({ store, hookBaseUrl: 'http://127.0.0.1:1', bin: process.execPath, binArgs: [FAKE], maxRuns: 1 });
  const app = createApp({ store, harness, workRoot: root, maxRuns: 1, distDir: dist });
  t.after(async () => { harness.shutdown(); await app.close(); });
  const get = (url: string) => app.inject({ method: 'GET', url, headers: { host: 'localhost:4780' } });
  assert.match((await get('/')).body, /<html lang="id">/);
  assert.match((await get('/projects/abc')).body, /<html lang="id">/);
  assert.match((await get('/assets/a.js')).headers['content-type'] as string, /javascript/);
  for (const u of ['/package.json', '/assets/tidak-ada.js', '/api/tidak-ada', '/hook/x']) assert.equal((await get(u)).statusCode, 404, u);
  assert.equal((await get('/api/health')).statusCode, 200);
});
