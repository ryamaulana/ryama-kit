#!/usr/bin/env node
// Backlog berdependensi untuk agent. Jalankan dari root proyek.
// Pemakaian: node backlog.js <perintah> [opsi]    (--file docs/backlog.json untuk path lain)
// Perintah: init | import <file|-> | add | list | ready | next | start <id> | done <id> --evidence "..."
//           fail <id> --reason "..." | decide <id> --answer "..." | reject <id> --reason "..." | unpark <id> | retry <id>
//           set <id[,id2]> --model opus|sonnet|haiku [--size s|m|l] | validate | md | status
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = {}, pos = [];
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { const k = argv[i].slice(2); const nx = argv[i + 1]; if (nx === undefined || nx.startsWith('--')) flags[k] = true; else { flags[k] = nx; i++; } }
  else pos.push(argv[i]);
}
const FILE = path.resolve(flags.file || 'docs/backlog.json');
const MD = path.join(path.dirname(FILE), 'BACKLOG.md');
const STATUS = ['todo', 'running', 'done', 'failed', 'rejected', 'parked'];
const VAL = { high: 0, mid: 1, low: 2 };
const MODELS = ['opus', 'sonnet', 'haiku'];
const die = (m) => { console.error('ERROR: ' + m); process.exit(1); };
const list = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : []);

function load() {
  if (!fs.existsSync(FILE)) die(`${FILE} belum ada. Jalankan: node backlog.js init`);
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { die('backlog.json rusak: ' + e.message); }
}
function problems(db) {
  const out = [], ids = new Set();
  for (const it of db.items) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(it.id || '')) out.push(`id tidak valid: "${it.id}" (huruf kecil, angka, tanda minus)`);
    if (ids.has(it.id)) out.push(`id ganda: ${it.id}`); ids.add(it.id);
    if (!STATUS.includes(it.status)) out.push(`${it.id}: status tidak dikenal "${it.status}"`);
    if (!it.title) out.push(`${it.id}: judul kosong`);
    if (it.model && !MODELS.includes(it.model)) out.push(`${it.id}: model tidak dikenal "${it.model}" (${MODELS.join(', ')})`);
  }
  for (const it of db.items) for (const n of it.needs || []) {
    if (!ids.has(n)) out.push(`${it.id}: needs "${n}" tidak ada`);
    if (n === it.id) out.push(`${it.id}: bergantung pada dirinya sendiri`);
  }
  // siklus (DFS)
  const by = Object.fromEntries(db.items.map((i) => [i.id, i])); const st = {};
  const visit = (id, trail) => {
    if (st[id] === 2) return; if (st[id] === 1) { out.push('siklus dependensi: ' + [...trail.slice(trail.indexOf(id)), id].join(' -> ')); return; }
    st[id] = 1; for (const n of (by[id] && by[id].needs) || []) if (by[n]) visit(n, [...trail, id]); st[id] = 2;
  };
  db.items.forEach((i) => visit(i.id, []));
  for (const it of db.items) for (const n of it.needs || []) if (by[n] && by[n].status === 'rejected' && it.status === 'todo') out.push(`${it.id}: menunggu ${n} yang ditolak`);
  return out;
}
function save(db) {
  const p = problems(db); if (p.length) die('backlog tidak valid:\n- ' + p.join('\n- '));
  db.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  fs.writeFileSync(MD, render(db));
}
const byId = (db) => Object.fromEntries(db.items.map((i) => [i.id, i]));
const isReady = (db, it) => { const m = byId(db); return it.status === 'todo' && (it.needs || []).every((n) => m[n] && (m[n].status === 'done')); };
const sorter = (db) => (a, b) => (VAL[a.value || 'mid'] - VAL[b.value || 'mid']) || (db.items.indexOf(a) - db.items.indexOf(b));
const readyList = (db) => db.items.filter((i) => isReady(db, i)).sort(sorter(db));

function render(db) {
  const c = (s) => db.items.filter((i) => i.status === s);
  const m = byId(db), done = c('done').length, tot = db.items.filter((i) => i.status !== 'rejected' && i.status !== 'parked').length;
  const ready = readyList(db), readyIds = new Set(ready.map((i) => i.id));
  const waiting = db.items.filter((i) => i.status === 'todo' && !readyIds.has(i.id));
  const row = (i) => `| ${i.id} | ${i.type || '-'} | ${i.title}${i.checkpoint ? ' (keputusan pemilik)' : ''} | ${i.agent || '-'}${i.model ? ' (' + i.model + ')' : ''} | ${i.value || 'mid'}/${i.size || 'm'} |`;
  const head = '| ID | Jenis | Judul | Agent | Nilai/Usaha |\n|---|---|---|---|---|';
  let s = `# Backlog${db.project ? ' - ' + db.project : ''}\n\nDiperbarui otomatis oleh backlog.js. Jangan edit tangan; ubah lewat perintah atau agent backlog.\n\n**Progres: ${done}/${tot} selesai** · berjalan ${c('running').length} · siap ${ready.length} · menunggu ${waiting.length} · gagal ${c('failed').length}\n\n`;
  const sec = (t, arr, f) => { if (arr.length) s += `## ${t}\n\n${f}\n\n`; };
  sec('Berjalan', c('running'), head + '\n' + c('running').map(row).join('\n'));
  sec('Siap dikerjakan', ready, head + '\n' + ready.map(row).join('\n'));
  sec('Menunggu dependensi', waiting, '| ID | Judul | Menunggu |\n|---|---|---|\n' + waiting.map((i) => `| ${i.id} | ${i.title} | ${(i.needs || []).filter((n) => m[n].status !== 'done').join(', ')} |`).join('\n'));
  sec('Gagal (perlu keputusan)', c('failed'), '| ID | Judul | Alasan |\n|---|---|---|\n' + c('failed').map((i) => `| ${i.id} | ${i.title} | ${i.lastFailure || '-'} |`).join('\n'));
  sec('Selesai', c('done'), '| ID | Judul | Bukti |\n|---|---|---|\n' + c('done').map((i) => `| ${i.id} | ${i.title} | ${(i.evidence || '').replace(/\|/g, '/')} |`).join('\n'));
  sec('Ide / nanti (diparkir, belum dikerjakan)', c('parked'), c('parked').map((i) => `- ${i.id}: ${i.title}${i.notes ? ' - ' + i.notes : ''}`).join('\n'));
  sec('Ditolak', c('rejected'), c('rejected').map((i) => `- ${i.id}: ${i.title} (${i.reason || '-'})`).join('\n'));
  return s;
}
// Aturan hemat token untuk setiap agent. Biaya terbesar = jumlah giliran x ukuran konteks: tiap giliran membaca ulang seluruh konteks.
const HEMAT = [
  'Hemat token (wajib): setiap giliran membaca ulang seluruh konteksmu, jadi kurangi giliran dan jaga konteks kecil.',
  '- Gabungkan perintah cek dalam SATU Bash (mis. build && tes) dan potong outputnya (tail -n 30, mode ringkas/quiet). Pakai path lengkap, jangan `cd` terpisah.',
  '- File besar dibaca per bagian (Grep lalu Read offset/limit). Jangan membaca ulang file, gambar, atau dokumen yang sudah dibaca kecuali isinya berubah.',
  '- Laporan akhir maks 15 baris: hasil, bukti (perintah yang dijalankan + angka lulus/gagal, atau path), masalah terbuka. Tanpa salinan kode, log panjang, atau ringkasan ulang dokumen.',
].join('\n');
function packet(db, it) {
  const ctx = (it.context || []).join('; ') || '(tidak ada; baca PRD bagian kriteria terkait)';
  const others = readyList(db).filter((x) => x.id !== it.id).map((x) => x.id);
  return [
    `ITEM ${it.id} [${it.type || '-'}] agent=${it.agent || '-'}${it.model ? ' model=' + it.model : ''} nilai=${it.value || 'mid'} usaha=${it.size || 'm'}${it.checkpoint ? ' PEMILIK=ya' : ''}`,
    it.model && !it.checkpoint ? `Orkestrator: panggil agent ini dengan model=${it.model} (parameter model di tool Agent).` : null,
    `Judul: ${it.title}`,
    it.screen ? `Layar: ${it.screen}` : null,
    it.slice ? `Irisan: ${it.slice}` : null,
    `Kriteria PRD: ${(it.criteria || []).join(', ') || '-'}`,
    `Konteks (baca HANYA ini): ${ctx}`,
    `Selesai bila: ${it.done || '(lihat kriteria PRD di atas)'}`,
    it.notes ? `Catatan: ${it.notes}` : null,
    it.lastFailure ? `Kegagalan sebelumnya: ${it.lastFailure}` : null,
    it.checkpoint ? null : HEMAT,
    it.checkpoint ? `Tanyakan ke pemilik (AskUserQuestion): ${it.checkpoint}\nSetelah dijawab: node backlog.js decide ${it.id} --answer "<jawaban>"` : `Mulai: node backlog.js start ${it.id}\nSelesai: node backlog.js done ${it.id} --evidence "<path screenshot/hasil tes/angka audit>"\nGagal: node backlog.js fail ${it.id} --reason "<sebab>"`,
    others.length ? `Siap juga (bisa paralel jika tidak berbagi file): ${others.join(', ')}` : null
  ].filter(Boolean).join('\n');
}
const find = (db, id) => { const it = db.items.find((x) => x.id === id); if (!it) die('item tidak ada: ' + id); return it; };

switch (cmd) {
  case 'init': {
    if (fs.existsSync(FILE) && !flags.force) die(`${FILE} sudah ada (pakai --force untuk menimpa)`);
    save({ version: 1, project: flags.project || '', items: [] }); console.log('dibuat: ' + FILE); break;
  }
  case 'import': {
    const src = pos[0]; if (!src) die('import <file.json|->');
    const raw = src === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(src, 'utf8');
    let plan; try { plan = JSON.parse(raw); } catch (e) { die('JSON rencana rusak: ' + e.message); }
    const items = Array.isArray(plan) ? plan : plan.items; if (!Array.isArray(items)) die('rencana harus array item atau {items:[...]}');
    const db = fs.existsSync(FILE) ? load() : { version: 1, project: plan.project || '', items: [] };
    if (plan.project && !db.project) db.project = plan.project;
    const m = byId(db); let added = 0, updated = 0, kept = 0;
    for (const n of items) {
      const it = { status: 'todo', needs: [], criteria: [], context: [], ...n }; it.needs = list(it.needs); it.criteria = list(it.criteria); it.context = list(it.context);
      const old = m[it.id];
      if (!old) { it.status = 'todo'; db.items.push(it); added++; }
      else if (old.status === 'todo') { Object.assign(old, { ...it, status: 'todo', attempts: old.attempts }); updated++; }
      else kept++;
    }
    if (flags['replace-todo']) { const keep = new Set(items.map((x) => x.id)); db.items = db.items.filter((x) => x.status !== 'todo' || keep.has(x.id)); }
    save(db); console.log(`import: ${added} baru, ${updated} diperbarui, ${kept} dipertahankan (sudah berjalan/selesai)`); break;
  }
  case 'add': {
    const db = load(); if (!flags.id || !flags.title) die('add --id <id> --title "<judul>" [--type --agent --needs a,b --criteria AC1 --context path --value --size --done --checkpoint --slice --model --park]');
    if (db.items.some((x) => x.id === flags.id)) die('id sudah ada: ' + flags.id);
    db.items.push({ id: flags.id, title: flags.title, type: flags.type, agent: flags.agent, status: flags.park ? 'parked' : 'todo', needs: list(flags.needs), criteria: list(flags.criteria), context: list(flags.context), value: flags.value || 'mid', size: flags.size || 'm', done: flags.done, screen: flags.screen, slice: flags.slice, model: typeof flags.model === 'string' ? flags.model : undefined, checkpoint: flags.checkpoint, notes: flags.notes });
    save(db); console.log('ditambah: ' + flags.id); break;
  }
  case 'list': { const db = load(); const rd = new Set(readyList(db).map((i) => i.id)); for (const i of db.items) { if (flags.status && i.status !== flags.status) continue; console.log(`${i.id}\t${i.status}${rd.has(i.id) ? '*siap' : ''}\t${i.type || '-'}\t${i.title}\tneeds:${(i.needs || []).join(',') || '-'}`); } break; }
  case 'ready': { const db = load(); const r = readyList(db); if (flags.json) console.log(JSON.stringify(r, null, 2)); else console.log(r.map((i) => `${i.id}\t${i.agent || '-'}${i.model ? '/' + i.model : ''}\t${i.title}`).join('\n') || '(tidak ada item siap)'); break; }
  case 'next': {
    const db = load(); const r = readyList(db);
    if (!r.length) { const run = db.items.filter((i) => i.status === 'running'), fl = db.items.filter((i) => i.status === 'failed'), wt = db.items.filter((i) => i.status === 'todo');
      console.log(`TIDAK ADA ITEM SIAP. berjalan:${run.length} gagal:${fl.length} menunggu:${wt.length} ${wt.length || fl.length ? '(cek: node backlog.js md; item gagal perlu keputusan pemilik)' : '(backlog selesai)'}`); process.exit(2); }
    if (flags.json) console.log(JSON.stringify(r[0], null, 2)); else console.log(packet(db, r[0])); break;
  }
  case 'start': { const db = load(), it = find(db, pos[0]); if (!isReady(db, it) && it.status !== 'running') die(`${it.id} belum siap (status ${it.status}, menunggu: ${(it.needs || []).filter((n) => byId(db)[n].status !== 'done').join(', ') || '-'})`); it.status = 'running'; it.attempts = (it.attempts || 0) + 1; it.startedAt = new Date().toISOString(); save(db); console.log('berjalan: ' + it.id); break; }
  case 'done': {
    const db = load(), it = find(db, pos[0]);
    if (!flags.evidence || flags.evidence === true) die('done wajib --evidence "<path screenshot, hasil tes, atau angka audit>". Tanpa bukti tidak boleh selesai.');
    if (it.status !== 'running' && it.status !== 'todo') die(`${it.id} berstatus ${it.status}`);
    it.status = 'done'; it.evidence = String(flags.evidence); it.finishedAt = new Date().toISOString(); save(db);
    const nxt = readyList(db).map((i) => i.id); console.log(`selesai: ${it.id}. Siap berikutnya: ${nxt.join(', ') || '(tidak ada)'}`); break;
  }
  case 'fail': {
    const db = load(), it = find(db, pos[0]); it.lastFailure = String(flags.reason || 'tanpa alasan');
    it.status = (it.attempts || 0) >= 2 ? 'failed' : 'todo'; save(db);
    console.log(it.status === 'failed' ? `gagal dua kali: ${it.id} butuh keputusan pemilik` : `dikembalikan ke antrean: ${it.id} (percobaan ${it.attempts || 0}/2)`); break;
  }
  case 'decide': { const db = load(), it = find(db, pos[0]); if (!it.checkpoint) die(it.id + ' bukan item keputusan'); if (!flags.answer || flags.answer === true) die('decide --answer "<jawaban pemilik>"'); it.status = 'done'; it.evidence = 'Keputusan pemilik: ' + flags.answer; it.finishedAt = new Date().toISOString(); save(db); console.log('diputuskan: ' + it.id); break; }
  case 'set': {
    const db = load(); const ids = list(pos[0]); if (!ids.length || (!flags.model && !flags.size)) die('set <id[,id2]> --model opus|sonnet|haiku|bawaan [--size s|m|l]');
    for (const id of ids) { const it = find(db, id); if (it.status !== 'todo' && it.status !== 'parked') die(`${id} berstatus ${it.status}; hanya item yang belum jalan yang bisa diubah`);
      if (flags.model) { if (flags.model === 'bawaan') delete it.model; else it.model = String(flags.model); } if (flags.size) it.size = String(flags.size); }
    save(db); console.log(`diubah: ${ids.join(', ')}`); break;
  }
  case 'retry': { const db = load(), it = find(db, pos[0]); it.status = 'todo'; it.attempts = 0; save(db); console.log('diulang: ' + it.id); break; }
  case 'unpark': { const db = load(), it = find(db, pos[0]); if (it.status !== 'parked') die(it.id + ' tidak sedang diparkir'); it.status = 'todo'; save(db); console.log('dikeluarkan dari parkiran: ' + it.id); break; }
  case 'reject': { const db = load(), it = find(db, pos[0]); it.status = 'rejected'; it.reason = String(flags.reason || ''); save(db); console.log('ditolak: ' + it.id); break; }
  case 'validate': { const db = load(); const p = problems(db); if (p.length) { console.log('TIDAK VALID:\n- ' + p.join('\n- ')); process.exit(1); } console.log(`valid: ${db.items.length} item`); break; }
  case 'md': { const db = load(); save(db); console.log('diperbarui: ' + MD); break; }
  case 'status': { const db = load(); const n = (s) => db.items.filter((i) => i.status === s).length; console.log(JSON.stringify({ total: db.items.length, done: n('done'), running: n('running'), ready: readyList(db).length, failed: n('failed'), todo: n('todo') })); break; }
  default: console.log('Perintah: init | import <file|-> | add | list | ready | next | start <id> | done <id> --evidence | fail <id> --reason | decide <id> --answer | reject <id> | retry <id> | set <id> --model | validate | md | status'); process.exit(cmd ? 1 : 0);
}
