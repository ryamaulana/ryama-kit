// Seam: projects.ts (createFolder, projectId, batas 500) + GET/POST /api/folders. Harapan dari ARCHITECTURE 6.2 dan PRD F2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { browseFolder, createFolder, projectId, projectKey, PathError } from '../src/projects.js';

const mk = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-fo-')));
const code = (fn: () => unknown) => { try { fn(); } catch (e) { return e instanceof PathError ? e.code : 'bukan-PathError'; } return 'tidak-melempar'; };

test('createFolder: membuat folder + git init, kedalaman bebas, mengembalikan listing folder baru', () => {
  const root = mk();
  fs.mkdirSync(path.join(root, 'a', 'b'), { recursive: true });
  const r = createFolder(root, path.join(root, 'a', 'b'), 'baru');
  assert.equal(r.path, path.join(root, 'a', 'b', 'baru'));
  assert.equal(r.name, 'baru');
  assert.equal(r.parent, path.join(root, 'a', 'b'));
  assert.ok(fs.existsSync(path.join(r.path, '.git', 'HEAD')));
});

test('createFolder: nama terlarang -> invalid_folder_name', () => {
  const root = mk();
  const bad = ['', '.', '..', 'a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b', 'x'.repeat(101),
    'CON', 'con', 'PRN', 'aux', 'NUL', 'COM1', 'lpt9', 'nul.txt', 'baru.', 'baru ', 'a\0b', 'a\nb'];
  for (const n of bad) assert.equal(code(() => createFolder(root, root, n)), 'invalid_folder_name', JSON.stringify(n));
  assert.equal(fs.readdirSync(root).length, 0);
  assert.doesNotThrow(() => createFolder(root, root, 'x'.repeat(100)));
  assert.doesNotThrow(() => createFolder(root, root, 'CONSOLE'));
});

test('createFolder: sudah ada -> folder_exists; induk di luar akar atau lewat symlink keluar -> project_outside_root', () => {
  const base = mk();
  const root = path.join(base, 'kerja'); fs.mkdirSync(root);
  fs.mkdirSync(path.join(base, 'luar'));
  fs.mkdirSync(path.join(root, 'ada'));
  assert.equal(code(() => createFolder(root, root, 'ada')), 'folder_exists');
  assert.equal(code(() => createFolder(root, root, 'ADA-berkas') ), 'tidak-melempar');
  fs.writeFileSync(path.join(root, 'berkas'), 'x');
  assert.equal(code(() => createFolder(root, root, 'berkas')), 'folder_exists');
  assert.equal(code(() => createFolder(root, base, 'x')), 'project_outside_root');
  assert.equal(code(() => createFolder(root, path.join(root, '..', 'luar'), 'x')), 'project_outside_root');
  fs.symlinkSync(path.join(base, 'luar'), path.join(root, 'tautan'), 'junction');
  assert.equal(code(() => createFolder(root, path.join(root, 'tautan'), 'x')), 'project_outside_root');
  assert.deepEqual(fs.readdirSync(path.join(base, 'luar')), []);
});

test('browseFolder: dibatasi 500 per tingkat, urut nama', () => {
  const root = mk();
  for (let i = 0; i < 520; i++) fs.mkdirSync(path.join(root, 'd' + String(i).padStart(3, '0')));
  const r = browseFolder(root);
  assert.equal(r.folders.length, 500);
});

test('projectId: 12 heks dari sha1 projectKey, stabil', () => {
  const p = path.join(os.tmpdir(), 'contoh');
  const expected = createHash('sha1').update(projectKey(p)).digest('hex').slice(0, 12);
  assert.equal(projectId(p), expected);
  assert.match(projectId(p), /^[0-9a-f]{12}$/);
  assert.notEqual(projectId(p), projectId(p + '2'));
});
