// Pembatasan folder kerja: run hanya boleh di subfolder folder kerja yang diizinkan.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export class PathError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** true bila target di dalam base (sama dengan base hanya bila allowEqual). Murni string, tanpa akses disk. */
export function isInside(base: string, target: string, allowEqual = false): boolean {
  const rel = path.relative(path.resolve(base), path.resolve(target));
  if (rel === '') return allowEqual;
  return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

/**
 * Path nyata (symlink/junction diselesaikan) folder di dalam folder kerja, atau PathError.
 * Folder kerja itu sendiri boleh (dipilih pemilik sebagai akar); kedalaman bebas.
 */
export function resolveProject(workRoot: string, requested: string): string {
  if (requested.includes('\0') || !path.isAbsolute(requested)) {
    throw new PathError('invalid_project', 'Folder proyek harus berupa path absolut.');
  }
  let real: string;
  let root: string;
  try {
    root = fs.realpathSync(workRoot);
    real = fs.realpathSync(requested);
  } catch {
    throw new PathError('project_not_found', 'Folder proyek tidak ditemukan.');
  }
  if (!fs.statSync(real).isDirectory()) throw new PathError('invalid_project', 'Proyek harus berupa folder.');
  if (!isInside(root, real, true)) throw new PathError('project_outside_root', 'Folder proyek harus berada di bawah folder kerja yang diizinkan.');
  return real;
}

export function listProjects(workRoot: string): { name: string; path: string }[] {
  try {
    return fs
      .readdirSync(workRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
      .map((d) => ({ name: d.name, path: path.join(workRoot, d.name) }));
  } catch {
    return [];
  }
}

const MAX_FOLDERS = 500;

/**
 * Isi satu folder untuk dijelajahi bertahap. `requested` kosong = folder kerja.
 * Entri symlink/junction yang menunjuk ke luar folder kerja disembunyikan. Path yang keluar adalah path nyata.
 */
export function browseFolder(workRoot: string, requested?: string) {
  const root = fs.realpathSync(workRoot);
  const dir = resolveProject(workRoot, requested ?? workRoot);
  const folders: { name: string; path: string }[] = [];
  // Urut nama dulu supaya batas 500 memotong dari ujung daftar, bukan urutan acak disk.
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  for (const d of entries) {
    if (folders.length >= MAX_FOLDERS) break;
    if (d.name.startsWith('.') || d.name === 'node_modules') continue;
    if (!d.isDirectory() && !d.isSymbolicLink()) continue;
    try {
      const real = fs.realpathSync(path.join(dir, d.name));
      if (fs.statSync(real).isDirectory() && isInside(root, real)) folders.push({ name: d.name, path: real });
    } catch { /* tidak terbaca: lewati */ }
  }
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const isRoot = !isInside(root, dir);
  return { path: dir, name: path.basename(dir) || dir, parent: isRoot ? null : path.dirname(dir), isRoot, folders };
}

/** Kunci proyek untuk aturan "satu run aktif per proyek". Windows tidak membedakan huruf besar/kecil. */
export const projectKey = (realPath: string) => (process.platform === 'win32' ? realPath.toLowerCase() : realPath);

/** ID proyek: 12 heks pertama sha1 dari projectKey. */
export const projectId = (realPath: string) => createHash('sha1').update(projectKey(realPath)).digest('hex').slice(0, 12);

const WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
function validFolderName(name: string): boolean {
  return typeof name === 'string' && name.length >= 1 && name.length <= 100
    && !/[\\/:*?"<>|\x00-\x1f]/.test(name)
    && name !== '.' && name !== '..' && !/[. ]$/.test(name)
    && !WIN_RESERVED.test(name.split('.')[0]);
}

/** Buat folder `name` di `parent` (di dalam folder kerja, kedalaman bebas) lalu `git init`. Mengembalikan listing folder baru. */
export function createFolder(workRoot: string, parent: string, name: string) {
  if (!validFolderName(name)) throw new PathError('invalid_folder_name', 'Nama folder tidak valid.');
  const dir = resolveProject(workRoot, parent);
  const target = path.join(dir, name);
  if (fs.existsSync(target) || fs.lstatSync(target, { throwIfNoEntry: false })) {
    throw new PathError('folder_exists', 'Folder dengan nama itu sudah ada.');
  }
  try { fs.mkdirSync(target); } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new PathError('folder_exists', 'Folder dengan nama itu sudah ada.');
    throw e;
  }
  try { execFileSync('git', ['init', '-q'], { cwd: target, stdio: 'ignore', timeout: 10000 }); } catch { /* git tidak ada: folder tetap dibuat */ }
  return browseFolder(workRoot, target);
}
