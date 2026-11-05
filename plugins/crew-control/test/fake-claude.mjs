// `claude` tiruan untuk tes Harness (pola skenario spike/probe.mjs). Skenario dipilih dari prompt: "[nama]".
// Meniru protokol yang dipakai spike: stream-json, control_request can_use_tool ke induk, hook PreToolUse via HTTP.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const settings = JSON.parse(args[args.indexOf('--settings') + 1]);
const hookUrl = settings.hooks.PreToolUse[0].hooks[0].url;
const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waiting = new Map();
const extras = [];
let n = 0;
let sc = 'ok';
let started = false;

const say = (text) => out({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }] } });
const finish = (extra = {}) =>
  out({ type: 'result', subtype: 'success', is_error: false, usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation_input_tokens: 2 }, ...extra });
const askHost = (request) => {
  const id = 'h' + ++n;
  out({ type: 'control_request', request_id: id, request });
  return new Promise((r) => waiting.set(id, { r, id }));
};
// Langkah alat seperti claude asli: tool_use -> hook PreToolUse -> izin ke induk.
async function tool(name, input) {
  out({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't' + ++n, name, input }] } });
  const h = await fetch(hookUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: name, tool_input: input }),
  }).then((r) => r.json()).catch(() => ({}));
  if (h.hookSpecificOutput?.permissionDecision === 'deny') return { behavior: 'deny', message: h.hookSpecificOutput.permissionDecisionReason };
  const res = await askHost({ subtype: 'can_use_tool', tool_name: name, input });
  return res.response ?? res;
}

async function run(prompt) {
    const cwd = process.cwd();
  if (sc === 'ok') { say('halo dari fake'); finish(); }
  if (sc === 'html') { say('<img src=x onerror=alert(1)> **tebal**'); finish(); }
  if (sc === 'tanya' || sc === 'cancel') {
    const input = { questions: [{ question: 'Warna favorit?', header: 'Warna', multiSelect: false, options: [{ label: 'Merah', description: 'api' }, { label: 'Biru' }] }] };
    if (sc === 'cancel') {
      const p = askHost({ subtype: 'can_use_tool', tool_name: 'AskUserQuestion', input });
      await sleep(300);
      out({ type: 'control_cancel_request', request_id: 'h' + n });
      void p;
      await sleep(200);
      finish();
      return;
    }
    const res = (await askHost({ subtype: 'can_use_tool', tool_name: 'AskUserQuestion', input })).response;
    const jawab = res.updatedInput.answers['Warna favorit?'];
    fs.writeFileSync(path.join(cwd, 'jawaban.txt'), jawab);
    say('jawaban diterima: ' + jawab);
    finish();
  }
  if (sc === 'izin') {
    const r1 = await tool('Write', { file_path: 'dalam.txt', content: '1' });
    if (r1.behavior === 'allow') fs.writeFileSync(path.join(cwd, 'dalam.txt'), '1');
    const r2 = await tool('Write', { file_path: '../luar.txt', content: '2' });
    say(r2.behavior === 'allow' ? 'izin:allow' : 'izin:deny:' + r2.message);
    finish();
  }
  if (sc === 'pesan') {
    const t = tool('Bash', { command: 'sleep 1' });
    await sleep(1200);
    await t;
    if (extras.length) fs.writeFileSync(path.join(cwd, 'pesan.txt'), extras.join('|'));
    say('selesai menunggu');
    finish();
  }
  if (sc === 'jeda') {
    for (const f of ['a', 'b', 'c']) {
      if (f !== 'a') await sleep(400); // celah untuk menekan Jeda di antara langkah
      const r = await tool('Write', { file_path: f + '.txt', content: f });
      if (r.behavior === 'allow') fs.writeFileSync(path.join(cwd, f + '.txt'), f);
      else break;
    }
    finish();
  }
  if (sc === 'stop' || sc === 'stop-hang') {
    await tool('Bash', { command: 'ping -n 60 127.0.0.1' });
    await sleep(60000);
  }
  if (sc === 'crash') {
    process.stderr.write('boom: sesuatu rusak\n');
    process.exit(3);
  }
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const m = JSON.parse(line);
  if (m.type === 'control_response') {
    const w = waiting.get(m.response.request_id);
    if (w) { waiting.delete(w.id); w.r(m.response); }
  } else if (m.type === 'control_request') {
    out({ type: 'control_response', response: { subtype: 'success', request_id: m.request_id, response: {} } });
    if (m.request.subtype === 'interrupt' && sc !== 'stop-hang') out({ type: 'result', subtype: 'error_during_execution', is_error: true });
  } else if (m.type === 'user') {
    const text = typeof m.message.content === 'string' ? m.message.content : '';
    if (!started) {
      started = true;
      const resumed = args.includes('--resume') ? args[args.indexOf('--resume') + 1] : null;
      sc = /\[([\w-]+)\]/.exec(text)?.[1] ?? (resumed ? 'lanjut' : 'ok');
      out({ type: 'system', subtype: 'init', session_id: resumed ?? (args.includes('--session-id') ? args[args.indexOf('--session-id') + 1] : 'sess-fake'), model: 'fake', permissionMode: 'default' });
      if (sc === 'lanjut') { say(`lanjut:${resumed}:${text}:${args.includes('--model') ? args[args.indexOf('--model') + 1] : '-'}`); finish(); return; }
      run(text);
    } else extras.push(text);
  }
}).on('close', () => {
  if (sc === 'stop-hang') return; // sengaja tidak mau berhenti
  process.exit(0);
});
setInterval(() => {}, 1 << 30); // jaga proses tetap hidup sampai stdin ditutup
