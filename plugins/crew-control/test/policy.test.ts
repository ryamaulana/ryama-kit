// Seam: aturan izin A3 + pembatasan folder. Nilai harapan dari teks A3 di PRD, bukan dari kode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decide } from '../src/policy.js';
import { browseFolder, resolveProject, PathError } from '../src/projects.js';

const P = path.resolve(os.tmpdir(), 'cc-proj');
const rows: [string, string, unknown, 'allow' | 'ask'][] = [
  ['tulis file relatif di proyek', 'Write', { file_path: 'a.txt' }, 'allow'],
  ['tulis file absolut di proyek', 'Edit', { file_path: path.join(P, 'src', 'x.ts') }, 'allow'],
  ['tulis di luar proyek', 'Write', { file_path: path.resolve(P, '..', 'luar.txt') }, 'ask'],
  ['traversal ..', 'Write', { file_path: '../luar.txt' }, 'ask'],
  ['folder saudara berawalan sama', 'Write', { file_path: P + '-evil/x.txt' }, 'ask'],
  ['baca di proyek', 'Read', { file_path: 'README.md' }, 'allow'],
  ['Glob absolut', 'Glob', { pattern: 'C:\\Users\\*' }, 'ask'],
  ['npm test', 'Bash', { command: 'npm test' }, 'allow'],
  ['git commit lokal', 'Bash', { command: 'git commit -am "x"' }, 'allow'],
  ['rm -rf', 'Bash', { command: 'rm -rf build' }, 'ask'],
  ['Remove-Item -Recurse', 'PowerShell', { command: 'Remove-Item -Recurse -Force .\dist' }, 'ask'],
  ['git push', 'Bash', { command: 'git push origin main' }, 'ask'],
  ['npm install global', 'Bash', { command: 'npm install -g foo' }, 'ask'],
  ['npm install lokal', 'Bash', { command: 'npm install zod' }, 'allow'],
  ['cd keluar proyek', 'Bash', { command: 'cd .. && dir' }, 'ask'],
  ['path drive lain', 'PowerShell', { command: 'Get-Content C:\\Windows\\win.ini' }, 'ask'],
  ['path drive di proyek', 'PowerShell', { command: `Get-Content ${path.join(P, 'a.txt')}` }, 'allow'],
  ['alat tak dikenal', 'mcp__x__y', {}, 'ask'],
  ['subagent Task', 'Task', { prompt: 'x' }, 'allow'],
];
for (const [name, tool, input, want] of rows) {
  test(`A3: ${name} -> ${want}`, () => assert.equal(decide(tool, input, P).action, want));
}

const code = (f: () => unknown) => { try { f(); return 'ok'; } catch (e) { return e instanceof PathError ? e.code : 'other'; } };

test('resolveProject: folder kerja dan semua kedalaman di bawahnya; selain itu ditolak', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-root-'));
  fs.mkdirSync(path.join(root, 'app', 'sub', 'dalam'), { recursive: true });
  fs.mkdirSync(root + '-evil');
  assert.equal(fs.realpathSync(resolveProject(root, path.join(root, 'app'))), fs.realpathSync(path.join(root, 'app')));
  assert.equal(fs.realpathSync(resolveProject(root, path.join(root, 'app', 'sub', 'dalam'))), fs.realpathSync(path.join(root, 'app', 'sub', 'dalam')));
  assert.equal(fs.realpathSync(resolveProject(root, root)), fs.realpathSync(root)); // akar itu sendiri boleh
  assert.equal(code(() => resolveProject(root, root + '-evil')), 'project_outside_root');
  assert.equal(code(() => resolveProject(root, path.join(root, 'app', '..', '..'))), 'project_outside_root');
  assert.equal(code(() => resolveProject(root, os.tmpdir())), 'project_outside_root');
  assert.equal(code(() => resolveProject(root, path.join(root, 'tidak-ada'))), 'project_not_found');
  assert.equal(code(() => resolveProject(root, 'app')), 'invalid_project');
  assert.equal(code(() => resolveProject(root, path.join(root, 'app', 'sub', '..', '..', '..'))), 'project_outside_root');
});

test('browseFolder: bertahap, tanpa naik di atas akar, tautan keluar akar disembunyikan', () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cc-br-')));
  const root = path.join(base, 'kerja');
  const luar = path.join(base, 'rahasia');
  fs.mkdirSync(path.join(root, 'b', 'anak'), { recursive: true });
  fs.mkdirSync(path.join(root, 'A'));
  fs.mkdirSync(path.join(root, '.git'));
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.writeFileSync(path.join(root, 'berkas.txt'), 'x');
  fs.mkdirSync(luar);
  let linked = true;
  try { fs.symlinkSync(luar, path.join(root, 'tautan-keluar'), 'junction'); } catch { linked = false; }
  fs.symlinkSync(path.join(root, 'b'), path.join(root, 'tautan-dalam'), 'junction');

  const top = browseFolder(root);
  assert.equal(top.isRoot, true);
  assert.equal(top.parent, null);
  assert.deepEqual(top.folders.map((f) => f.name), ['A', 'b', 'tautan-dalam']); // urut nama, tanpa .git/node_modules/berkas/tautan keluar
  if (!linked) console.log('catatan: symlink tidak bisa dibuat di sini, bagian tautan keluar tidak teruji');
  const b = browseFolder(root, path.join(root, 'b'));
  assert.equal(b.isRoot, false);
  assert.equal(b.parent, root);
  assert.deepEqual(b.folders.map((f) => f.name), ['anak']);
  assert.equal(browseFolder(root, path.join(root, 'b', 'anak')).parent, path.join(root, 'b'));
  assert.equal(code(() => browseFolder(root, luar)), 'project_outside_root');
  assert.equal(code(() => browseFolder(root, path.join(root, '..'))), 'project_outside_root');
  assert.equal(code(() => browseFolder(root, root + '-evil')), 'project_not_found');
  if (linked) assert.equal(code(() => browseFolder(root, path.join(root, 'tautan-keluar'))), 'project_outside_root');
});
