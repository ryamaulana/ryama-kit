// Mode izin A3 (default PRD): perubahan file dan perintah di dalam folder proyek disetujui otomatis;
// di luar folder proyek atau yang merusak ditanyakan lewat Chat.
// shortcut: deteksi perintah shell memakai pola teks (bukan parser shell) dan symlink di dalam proyek tidak diselesaikan;
// naikkan bila ada celah nyata atau sebelum dipakai di luar laptop sendiri.
import os from 'node:os';
import path from 'node:path';
import { isInside } from './projects.js';

/** Aturan "Selalu setujui" per proyek: pattern null = alat itu apa pun inputnya; alat file = folder; shell = awalan perintah. */
export type PermissionRule = { tool: string; pattern: string | null };
/** ask.rule = aturan yang boleh disimpan bila pemilik memilih Selalu setujui; null = kategori berisiko (rule_not_allowed). */
export type PermissionDecision = { action: 'allow' } | { action: 'ask'; why: string; rule: PermissionRule | null };
type Ask = Extract<PermissionDecision, { action: 'ask' }>;

const FILE_TOOLS = new Set(['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Glob', 'Grep', 'LS']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const SAFE_TOOLS = new Set([
  'Task', 'Agent', 'TodoWrite', 'Skill', 'ToolSearch', 'BashOutput', 'KillShell', 'KillBash', 'ExitPlanMode', 'SlashCommand',
]);

const DESTRUCTIVE: [RegExp, string][] = [
  [/\brm\s+(-[a-z]*[rf][a-z]*|--recursive|--force)\b/i, 'hapus massal'],
  [/\bRemove-Item\b[^\n]*(-Recurse|-Force)/i, 'hapus massal'],
  [/\b(del|erase|rmdir|rd)\b[^\n]*\/s\b/i, 'hapus massal'],
  [/\bgit\s+push\b/i, 'git push'],
  [/\bgit\s+(reset\s+--hard|clean\b)/i, 'membuang perubahan git'],
  [/\b(npm|pnpm|yarn)\s+(i|install|add)\b[^\n]*(\s-g\b|--global)/i, 'instal global'],
  [/\b(winget|choco|scoop)\s+(install|upgrade|uninstall)\b/i, 'instal global'],
  [/\bpip\d?\s+install\b[^\n]*--user/i, 'instal global'],
  [/\bformat\s+[a-z]:/i, 'format disk'],
  [/\b(curl|wget|iwr|Invoke-WebRequest)\b[^\n]*\|\s*(sh|bash|iex|Invoke-Expression)\b/i, 'unduh lalu jalankan'],
  [/\b(sudo|shutdown|Restart-Computer|Stop-Computer)\b/i, 'perintah sistem'],
];

// Mengembalikan alasan bertanya, atau null bila perintah aman menurut A3.
function shellReason(command: string, projectDir: string): { why: string; risky: boolean } | null {
  for (const [re, why] of DESTRUCTIVE) if (re.test(command)) return { why: `Perintah berisiko: ${why}`, risky: true };
  if (/(^|[\s"'\\/])\.\.(\s|[\\/]|$)/.test(command)) return { why: 'Perintah keluar dari folder proyek (..)', risky: false };
  if (/(^|[\s"'=])(~|\$HOME|\$env:USERPROFILE|%USERPROFILE%)([\\/\s"']|$)/i.test(command)) return { why: 'Perintah menyentuh folder rumah', risky: false };
  if (/\\\\[\w.$-]+\\/.test(command)) return { why: 'Perintah menyentuh path jaringan', risky: false };
  for (const m of command.matchAll(/[A-Za-z]:[\\/][^\s"'|;&<>]*/g)) {
    if (!isInside(projectDir, m[0], true)) return { why: `Perintah menyentuh path di luar folder proyek: ${m[0]}`, risky: false };
  }
  return null;
}

// Rantai, pipa, redirect, substitusi: sisa setelah awalan tidak boleh memuat perintah lain.
const CHAIN = /[;&|`<>\n\r]|\$\(/;

function matches(rule: PermissionRule, tool: string, inp: Record<string, unknown>, projectDir: string): boolean {
  if (rule.tool !== tool) return false;
  if (rule.pattern === null) return true;
  if (SHELL_TOOLS.has(tool)) {
    const cmd = typeof inp.command === 'string' ? inp.command : '';
    if (cmd === rule.pattern) return true;
    if (!cmd.startsWith(rule.pattern + ' ')) return false;
    const rest = cmd.slice(rule.pattern.length);
    return !CHAIN.test(rest) && shellReason(rest, projectDir) === null;
  }
  const paths = filePaths(inp);
  return paths.length > 0 && paths.every((p) => isInside(rule.pattern!, path.resolve(projectDir, p), true));
}

const filePaths = (inp: Record<string, unknown>) =>
  [inp.file_path, inp.notebook_path, inp.path].filter((p): p is string => typeof p === 'string');

// Folder aturan untuk path di luar proyek; akar disk dan folder rumah terlalu luas untuk "selalu".
function folderRule(tool: string, abs: string, isDir: boolean): PermissionRule | null {
  const dir = isDir ? abs : path.dirname(abs);
  if (path.parse(dir).root === dir || path.resolve(dir) === path.resolve(os.homedir())) return null;
  return { tool, pattern: dir };
}

/** A3 tanpa aturan pemilik. */
function a3(tool: string, inp: Record<string, unknown>, projectDir: string): Ask | null {
  if (SAFE_TOOLS.has(tool)) return null;
  if (FILE_TOOLS.has(tool)) {
    // path.win32 juga: pola "C:\\..." absolut di Windows walau server dites di POSIX.
    if (typeof inp.pattern === 'string' && tool === 'Glob' && (path.isAbsolute(inp.pattern) || path.win32.isAbsolute(inp.pattern) || /(^|[\\/])\.\.([\\/]|$)/.test(inp.pattern))) {
      return { action: 'ask', why: 'Pola mencari di luar folder proyek', rule: null };
    }
    for (const p of filePaths(inp)) {
      const abs = path.resolve(projectDir, p);
      if (!isInside(projectDir, abs, true)) return { action: 'ask', why: `Path di luar folder proyek: ${p}`, rule: folderRule(tool, abs, p === inp.path) };
    }
    return null;
  }
  if (SHELL_TOOLS.has(tool)) {
    const command = typeof inp.command === 'string' ? inp.command : '';
    const r = shellReason(command, projectDir);
    return r && { action: 'ask', why: r.why, rule: r.risky ? null : { tool, pattern: command } };
  }
  return { action: 'ask', why: `Alat ${tool} belum punya aturan izin`, rule: { tool, pattern: null } };
}

/**
 * A3 lalu aturan "Selalu setujui" proyek. Aturan hanya membuka permintaan yang kategorinya tidak berisiko
 * (ask.rule != null); hapus massal, push, reset, instal global, unduh-jalankan, perintah sistem selalu ditanya.
 */
export function decide(tool: string, input: unknown, projectDir: string, rules: readonly PermissionRule[] = []): PermissionDecision {
  const inp = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const ask = a3(tool, inp, projectDir);
  if (!ask) return { action: 'allow' };
  if (ask.rule && rules.some((r) => matches(r, tool, inp, projectDir))) return { action: 'allow' };
  return ask;
}
