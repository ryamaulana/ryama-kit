// Seam: detectLimit(event, now) di src/harness/limits.ts. Nilai harapan dari fixture (dihitung tangan), bukan dari kode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectLimit } from '../src/harness/limits.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'limits');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

test('fixture limit tersedia', () => assert.ok(files.length >= 10));

for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  test(`limit: ${f}`, () => assert.deepEqual(detectLimit(c.event, new Date(c.now)), c.expected));
}

test('baris bukan objek bukan limit', () => {
  for (const e of [null, 'teks', 42, [], {}]) assert.equal(detectLimit(e, new Date()), null);
});
