// Parse frontmatter agents/*.md (subset YAML yang dipakai kit: skalar, "kutip", [a, b], daftar "- x", "a, b").
export class AgentMdError extends Error {
  constructor(public section: string, message: string) { super(message); }
}

export interface AgentDef { id: string; name: string; role: string; model: string | null; skills: string[]; tools: string[] }

const unquote = (s: string) => s.trim().replace(/^(["'])(.*)\1$/, '$2');
const toList = (v: string) => v.replace(/^\[|\]$/g, '').split(',').map(unquote).filter(Boolean);

export function parseAgentMd(text: string): AgentDef {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text.replace(/^﻿/, ''));
  if (!m) throw new AgentMdError('frontmatter', 'Frontmatter (--- ... ---) tidak ditemukan.');
  const f: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of m[1]!.split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) { (f[listKey] as string[]).push(unquote(item[1]!)); continue; }
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    if (kv[2] === '') { f[kv[1]!] = []; listKey = kv[1]!; } else { f[kv[1]!] = unquote(kv[2]!); listKey = null; }
  }
  const str = (k: string) => (typeof f[k] === 'string' ? (f[k] as string).trim() : '');
  const list = (k: string) => (Array.isArray(f[k]) ? (f[k] as string[]) : str(k) ? toList(str(k)) : []);
  const name = str('name');
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw new AgentMdError('name', 'Field name wajib (huruf kecil, angka, tanda hubung).');
  const role = str('description');
  if (!role) throw new AgentMdError('description', 'Field description wajib.');
  return { id: name, name, role, model: str('model') || null, skills: list('skills'), tools: list('tools') };
}
