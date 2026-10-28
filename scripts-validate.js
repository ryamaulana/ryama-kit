// Validasi struktur kit: node scripts-validate.js
const fs = require('fs'), path = require('path');
let bad = 0; const err = (m) => { bad++; console.log('GAGAL:', m); };
const J = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { err(`${f}: ${e.message}`); } };
const root = __dirname;
const mk = J(path.join(root, '.claude-plugin/marketplace.json'));
const skills = new Set(fs.readdirSync(path.join(root, 'skills')).filter((d) => fs.existsSync(path.join(root, 'skills', d, 'SKILL.md'))));
for (const p of mk.plugins) {
  const dir = path.join(root, p.source);
  const pj = J(path.join(dir, '.claude-plugin/plugin.json'));
  if (pj && pj.name !== p.name) err(`${p.name}: nama di plugin.json (${pj.name}) tidak cocok`);
  const hooks = path.join(dir, 'hooks/hooks.json');
  if (fs.existsSync(hooks)) {
    const h = J(hooks); const txt = fs.readFileSync(hooks, 'utf8');
    (txt.match(/hooks\/scripts\/[\w.-]+\.js/g) || []).forEach((s) => { if (!fs.existsSync(path.join(dir, s))) err(`${p.name}: hook script ${s} tidak ada`); });
  }
  const ad = path.join(dir, 'agents');
  if (fs.existsSync(ad)) for (const f of fs.readdirSync(ad)) {
    const t = fs.readFileSync(path.join(ad, f), 'utf8');
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(t);
    if (!m) { err(`${p.name}/agents/${f}: frontmatter tidak ada`); continue; }
    if (!/^name:/m.test(m[1]) || !/^description:/m.test(m[1])) err(`${f}: name/description kurang`);
    const sk = /^skills:[ \t]*\[(.*)\]/m.exec(m[1]); let names = sk ? sk[1].split(',').map((x) => x.trim()).filter(Boolean) : [];
    const blk = /^skills:[ \t]*\r?\n((?:[ \t]+- .*\r?\n?)+)/m.exec(m[1]); if (blk) names = blk[1].split(/\r?\n/).map((l) => l.replace(/^[ \t]+- /, '').trim()).filter(Boolean);
    const local = fs.existsSync(path.join(dir, 'skills')) ? fs.readdirSync(path.join(dir, 'skills')) : [];
    names.forEach((n) => { if (!skills.has(n) && !local.includes(n) && !['design-taste-frontend', 'web-design-guidelines'].includes(n)) err(`${f}: skill "${n}" tidak ditemukan di kit`); });
  }
  const cd = path.join(dir, 'commands');
  if (fs.existsSync(cd)) for (const f of fs.readdirSync(cd)) if (!/^---\r?\n[\s\S]*?description:/.test(fs.readFileSync(path.join(cd, f), 'utf8'))) err(`${p.name}/commands/${f}: description kurang`);
}
for (const s of skills) if (!/^---\r?\n[\s\S]*?name:[\s\S]*?description:/.test(fs.readFileSync(path.join(root, 'skills', s, 'SKILL.md'), 'utf8'))) err(`skills/${s}: frontmatter`);
console.log(bad ? `\n${bad} masalah` : `OK: ${mk.plugins.length} plugin, ${skills.size} skill`);
process.exit(bad ? 1 : 0);
