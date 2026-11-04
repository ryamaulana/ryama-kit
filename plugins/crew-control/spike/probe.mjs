// Spike A2 Crew Control: bukti teknis kendali sesi `claude -p` dari luar.
// Pakai: node spike/probe.mjs <skenario>
// Skenario: tanya | izin | pesan | jeda | stop | hook-izin | jawab-hook | tanya-desktop
// Tanpa dependensi. Menjalankan program `claude` asli (tidak diubah) dengan login pemilik.
//
// Jalur kendali yang diuji:
//  - stdin/stdout stream-json + `--permission-prompt-tool stdio`: CLI mengirim
//    control_request `can_use_tool` (izin dan AskUserQuestion) ke proses induk.
//  - hook HTTP (`--settings`): PreToolUse (gerbang jeda) dan PermissionRequest
//    (cara yang sama dipakai untuk sesi desktop, F10).

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKENARIO = process.argv[2] || 'tanya';
const HOOK_PORT = 4781; // hanya untuk spike; server Crew Control nanti di 4780
const SANDBOX = path.join(HERE, '_sandbox', SKENARIO);
const LOG = path.join(HERE, 'hasil', `${SKENARIO}.jsonl`);

fs.rmSync(SANDBOX, { recursive: true, force: true });
fs.mkdirSync(SANDBOX, { recursive: true });
fs.mkdirSync(path.dirname(LOG), { recursive: true });
fs.writeFileSync(LOG, '');

const t0 = Date.now();
const dt = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's';
// Data akun (email, organisasi) disamarkan sebelum masuk log bukti.
const redact = (s) =>
  s.replace(/"([A-Za-z_]*(email|Email|organization|orgName|org_name|accountUuid|account_uuid|organizationUuid)[A-Za-z_]*)":"[^"]*"/g, '"$1":"[disamarkan]"');
function log(arah, obj) {
  fs.appendFileSync(LOG, redact(JSON.stringify({ t: +((Date.now() - t0) / 1000).toFixed(2), arah, ...obj })) + '\n');
}
function say(...a) { console.log(dt(), ...a); }

// ---------- server hook HTTP ----------
let paused = false;
let resumeWaiters = [];
const hookAnswers = {}; // dipakai skenario hook-izin
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    let ev = {};
    try { ev = JSON.parse(body || '{}'); } catch {}
    const name = ev.hook_event_name;
    log('hook', { event: name, tool: ev.tool_name, input: ev.tool_input, agent: ev.agent_type || null });
    say('[hook]', name, ev.tool_name || '', ev.agent_type ? `(subagent ${ev.agent_type})` : '');
    let out = {};
    if (name === 'PreToolUse' && paused) {
      say('[hook] JEDA: menahan', ev.tool_name, 'sampai Lanjut');
      const tWait = Date.now();
      await new Promise((r) => resumeWaiters.push(r));
      say(`[hook] LANJUT: ${ev.tool_name} ditahan ${((Date.now() - tWait) / 1000).toFixed(1)}s`);
      log('hook-held', { tool: ev.tool_name, heldSec: (Date.now() - tWait) / 1000 });
    }
    if (name === 'PreToolUse' && SKENARIO === 'jawab-hook' && ev.tool_name === 'AskUserQuestion') {
      const q = ev.tool_input.questions[0];
      out = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          updatedInput: { ...ev.tool_input, answers: { [q.question]: q.options[1].label } },
        },
      };
      say('[hook] menjawab AskUserQuestion lewat hook:', q.options[1].label);
    }
    if (name === 'PermissionRequest' && SKENARIO === 'tanya-desktop' && ev.tool_name === 'AskUserQuestion') {
      // Jalur sesi desktop: PermissionRequest berjalan BERSAMA dialog host, jadi dialog
      // desktop tetap tampil dan siapa pun yang menjawab duluan yang dipakai.
      await new Promise((r) => setTimeout(r, 3000));
      const q = ev.tool_input.questions[0];
      out = {
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          decision: { behavior: 'allow', updatedInput: { ...ev.tool_input, answers: { [q.question]: q.options[1].label } } },
        },
      };
      say('[hook] PermissionRequest menjawab AskUserQuestion:', q.options[1].label, '(host stdio diam)');
    }
    if (name === 'PermissionRequest' && SKENARIO === 'hook-izin') {
      await new Promise((r) => setTimeout(r, 3000)); // "pemilik" butuh 3 detik di dashboard
      out = { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } };
      say('[hook] PermissionRequest diputuskan ALLOW lewat hook (host stdio sengaja diam)');
      hookAnswers.given = true;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
  });
});
await new Promise((r) => server.listen(HOOK_PORT, '127.0.0.1', r));

const hookCfg = (ev, matcher) => ({
  [ev]: [{ matcher, hooks: [{ type: 'http', url: `http://127.0.0.1:${HOOK_PORT}/hook`, timeout: 3600 }] }],
});
const settings = {
  hooks: {
    ...hookCfg('PreToolUse', '*'),
    ...hookCfg('PostToolUse', '*'),
    ...hookCfg('PermissionRequest', '*'),
  },
};

// ---------- proses claude ----------
const args = [
  '-p',
  '--input-format', 'stream-json',
  '--output-format', 'stream-json',
  '--verbose',
  '--model', 'haiku',
  '--permission-mode', 'default',
  '--settings', JSON.stringify(settings),
];
args.push('--permission-prompt-tool', 'stdio');
say('spawn claude', args.filter((a) => !a.startsWith('{')).join(' '));
const child = spawn('claude', args, { cwd: SANDBOX, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
child.stderr.on('data', (d) => { log('stderr', { text: String(d) }); });

let reqSeq = 0;
function send(obj) { log('kirim', { msg: obj }); child.stdin.write(JSON.stringify(obj) + '\n'); }
function control(request) {
  const request_id = `req_${++reqSeq}`;
  send({ type: 'control_request', request_id, request });
  return request_id;
}
function userMsg(text, extra = {}) {
  send({ type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null, session_id: '', ...extra });
}
function reply(request_id, response) {
  send({ type: 'control_response', response: { subtype: 'success', request_id, response } });
}

let sessionId = null;
let toolUses = 0;
const handlers = { onControl: null, onAssistantTool: null, onToolResult: null, onResult: null };

let buf = '';
child.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch { log('stdout-raw', { line }); continue; }
    log('terima', { msg: m });
    if (m.type === 'system' && m.subtype === 'init') {
      sessionId = m.session_id;
      say('init session', sessionId, 'model', m.model, 'mode', m.permissionMode, 'caps', (m.capabilities || []).join(','));
    } else if (m.type === 'control_request') {
      say('[control_request]', m.request?.subtype, m.request?.tool_name || '');
      handlers.onControl?.(m);
    } else if (m.type === 'control_cancel_request') {
      say('[control_cancel_request]', m.request_id);
    } else if (m.type === 'control_response') {
      say('[control_response]', JSON.stringify(m.response).slice(0, 200));
    } else if (m.type === 'assistant') {
      for (const c of m.message?.content || []) {
        if (c.type === 'text') say('[assistant]', c.text.replace(/\s+/g, ' ').slice(0, 160));
        if (c.type === 'tool_use') { toolUses++; say('[tool_use]', c.name, JSON.stringify(c.input).slice(0, 120)); handlers.onAssistantTool?.(c); }
      }
    } else if (m.type === 'user') {
      for (const c of (Array.isArray(m.message?.content) ? m.message.content : [])) {
        if (c.type === 'tool_result') { say('[tool_result]', String(typeof c.content === 'string' ? c.content : JSON.stringify(c.content)).replace(/\s+/g, ' ').slice(0, 140)); handlers.onToolResult?.(c); }
      }
    } else if (m.type === 'result') {
      say('[result]', m.subtype, 'stop_reason', m.stop_reason, 'denials', JSON.stringify(m.permission_denials || []).slice(0, 200), 'cost', m.total_cost_usd);
      handlers.onResult?.(m);
    } else if (m.type === 'system') {
      say('[system]', m.subtype, JSON.stringify(m).slice(0, 160));
    }
  }
});

let exitedAt = null;
child.on('exit', (code, sig) => { exitedAt = Date.now(); say('EXIT code', code, 'signal', sig); log('exit', { code, sig }); });

function finish(delayMs = 500) {
  setTimeout(() => {
    try { child.stdin.end(); } catch {}
    setTimeout(() => { if (!exitedAt) child.kill(); server.close(); setTimeout(() => process.exit(0), 300); }, 4000);
  }, delayMs);
}

control({ subtype: 'initialize', hooks: null });

// ---------- skenario ----------
const allow = (m) => reply(m.request_id, { behavior: 'allow', updatedInput: m.request.input });

if (SKENARIO === 'tanya' || SKENARIO === 'jawab-hook' || SKENARIO === 'tanya-desktop') {
  // A2.1: pertanyaan berpilihan dijawab dari luar
  handlers.onControl = (m) => {
    if (m.request.subtype !== 'can_use_tool') return;
    if (m.request.tool_name === 'AskUserQuestion' && SKENARIO !== 'tanya') { say('host stdio diam; pertanyaan dijawab hook'); return; }
    if (m.request.tool_name === 'AskUserQuestion') {
      const q = m.request.input.questions[0];
      say('PERTANYAAN:', q.question, '| pilihan:', q.options.map((o) => o.label).join(' / '));
      setTimeout(() => {
        reply(m.request_id, { behavior: 'allow', updatedInput: { ...m.request.input, answers: { [q.question]: 'Biru' } } });
        say('JAWAB: Biru (setelah 2 detik, seperti pemilik klik di Chat)');
      }, 2000);
    } else allow(m);
  };
  handlers.onResult = () => finish();
  userMsg('Gunakan tool AskUserQuestion untuk bertanya kepada saya: "Warna favorit?" dengan pilihan Merah dan Biru. Setelah dijawab, tulis jawabannya saja ke file jawaban.txt memakai tool Write, lalu selesai.');
}

if (SKENARIO === 'izin') {
  // A2.1: izin Setujui / Tolak dengan alasan
  let n = 0;
  handlers.onControl = (m) => {
    if (m.request.subtype !== 'can_use_tool') return;
    n++;
    say('IZIN diminta:', m.request.tool_name, JSON.stringify(m.request.input).slice(0, 100), 'saran:', JSON.stringify(m.request.permission_suggestions || []).slice(0, 120));
    if (n === 1) { allow(m); say('-> SETUJUI'); }
    else { reply(m.request_id, { behavior: 'deny', message: 'Ditolak pemilik: jangan membuat file kedua, cukup satu.' }); say('-> TOLAK dengan alasan'); }
  };
  handlers.onResult = () => finish();
  userMsg('Buat file satu.txt berisi "1" dengan tool Write. Lalu buat file dua.txt berisi "2" dengan tool Write. Laporkan singkat apa yang terjadi pada tiap file.');
}

if (SKENARIO === 'pesan') {
  // A2.2: pesan pemilik masuk ke sesi yang sedang jalan
  handlers.onControl = (m) => { if (m.request.subtype === 'can_use_tool') allow(m); };
  let sent = false;
  handlers.onAssistantTool = (c) => {
    if (!sent && (c.name === 'Bash' || c.name === 'PowerShell')) {
      sent = true;
      setTimeout(() => {
        say('KIRIM PESAN PEMILIK saat perintah lambat masih jalan');
        userMsg('Pesan dari pemilik: setelah perintah itu selesai, buat juga file nanas.txt berisi kata NANAS.');
      }, 3000);
    }
  };
  let results = 0;
  handlers.onResult = () => { results++; finish(); };
  userMsg('Jalankan perintah shell yang menunggu 15 detik (Bash: sleep 15, atau PowerShell: Start-Sleep 15). Setelah selesai, katakan "selesai menunggu".');
}

if (SKENARIO === 'jeda') {
  // A2.3: jeda di batas langkah alat, lanjut di sesi yang sama
  handlers.onControl = (m) => { if (m.request.subtype === 'can_use_tool') allow(m); };
  let done = 0;
  handlers.onToolResult = () => {
    done++;
    if (done === 1) {
      paused = true;
      say('PEMILIK TEKAN JEDA (setelah langkah alat pertama selesai)');
      setTimeout(() => {
        paused = false;
        say('PEMILIK TEKAN LANJUT (20 detik kemudian)');
        resumeWaiters.splice(0).forEach((r) => r());
      }, 20000);
    }
  };
  handlers.onResult = () => finish();
  userMsg('Buat tiga file satu per satu, masing-masing dengan panggilan tool Write terpisah dan berurutan: a.txt berisi "a", b.txt berisi "b", c.txt berisi "c". Jangan paralel.');
}

if (SKENARIO === 'stop') {
  // F2 Stop: interrupt lalu hentikan proses; ukur waktunya
  handlers.onControl = (m) => { if (m.request.subtype === 'can_use_tool') allow(m); };
  let fired = false;
  handlers.onAssistantTool = (c) => {
    if (fired) return;
    fired = true;
    setTimeout(() => {
      const tStop = Date.now();
      say('PEMILIK TEKAN STOP: kirim interrupt');
      control({ subtype: 'interrupt' });
      handlers.onResult = (m) => {
        say(`hasil setelah interrupt dalam ${((Date.now() - tStop) / 1000).toFixed(1)}s`);
        child.stdin.end();
        const k = setTimeout(() => child.kill(), 5000);
        child.on('exit', () => { clearTimeout(k); say(`proses berhenti total ${((Date.now() - tStop) / 1000).toFixed(1)}s setelah Stop`); server.close(); setTimeout(() => process.exit(0), 200); });
      };
    }, 3000);
  };
  userMsg('Jalankan persis perintah shell ini sebagai satu panggilan: ping -n 60 127.0.0.1 . Setelah selesai, buat file selesai.txt.');
}

if (SKENARIO === 'hook-izin') {
  // A2.4 (simulasi desktop): host stdio (seperti aplikasi desktop) TIDAK menjawab;
  // izin diberikan lewat hook PermissionRequest (jalur yang sama untuk sesi desktop).
  handlers.onControl = (m) => {
    if (m.request.subtype === 'can_use_tool') say('host stdio menerima permintaan izin dan SENGAJA tidak menjawab (seperti dialog desktop yang belum diklik)');
  };
  handlers.onResult = () => finish();
  userMsg('Buat file desktop.txt berisi "ok" dengan tool Write, lalu selesai.');
}

setTimeout(() => { say('BATAS WAKTU SPIKE'); child.kill(); server.close(); process.exit(1); }, 240000);
