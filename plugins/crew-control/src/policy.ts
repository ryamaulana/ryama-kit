// Mode izin A3 (default PRD): perubahan file dan perintah di dalam folder proyek disetujui otomatis;
// di luar folder proyek atau yang merusak ditanyakan lewat Chat.
// shortcut: deteksi perintah shell memakai pola teks (bukan parser shell) dan symlink di dalam proyek tidak diselesaikan;
// naikkan bila ada celah nyata atau sebelum dipakai di luar laptop sendiri.
import path from 'node:path';
import { isInside } from './projects.js';

export type PermissionDecision = { action: 'allow' } | { action: 'ask'; why: string };

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

function checkShell(command: string, projectDir: string): PermissionDecision {
  for (const [re, why] of DESTRUCTIVE) if (re.test(command)) return { action: 'ask', why: `Perintah berisiko: ${why}` };
  if (/(^|[\s"'\\/])\.\.(\s|[\\/]|$)/.test(command)) return { action: 'ask', why: 'Perintah keluar dari folder proyek (..)' };
  if (/(^|[\s"'=])(~|\$HOME|\$env:USERPROFILE|%USERPROFILE%)([\\/\s"']|$)/i.test(command)) return { action: 'ask', why: 'Perintah menyentuh folder rumah' };
  if (/\\\\[\w.$-]+\\/.test(command)) return { action: 'ask', why: 'Perintah menyentuh path jaringan' };
  for (const m of command.matchAll(/[A-Za-z]:[\\/][^\s"'|;&<>]*/g)) {
    if (!isInside(projectDir, m[0], true)) return { action: 'ask', why: `Perintah menyentuh path di luar folder proyek: ${m[0]}` };
  }
  return { action: 'allow' };
}

export function decide(tool: string, input: unknown, projectDir: string): PermissionDecision {
  const inp = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (SAFE_TOOLS.has(tool)) return { action: 'allow' };
  if (FILE_TOOLS.has(tool)) {
    const paths = [inp.file_path, inp.notebook_path, inp.path].filter((p): p is string => typeof p === 'string');
    if (typeof inp.pattern === 'string' && tool === 'Glob' && (path.isAbsolute(inp.pattern) || /(^|[\\/])\.\.([\\/]|$)/.test(inp.pattern))) {
      return { action: 'ask', why: 'Pola mencari di luar folder proyek' };
    }
    for (const p of paths) {
      if (!isInside(projectDir, path.resolve(projectDir, p), true)) return { action: 'ask', why: `Path di luar folder proyek: ${p}` };
    }
    return { action: 'allow' };
  }
  if (SHELL_TOOLS.has(tool)) return checkShell(typeof inp.command === 'string' ? inp.command : '', projectDir);
  return { action: 'ask', why: `Alat ${tool} belum punya aturan izin` };
}
