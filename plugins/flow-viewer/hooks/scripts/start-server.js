#!/usr/bin/env node
// Starts the flow-viewer server in the background. If a server from an OLDER build is still running, replaces it.
// Silent; always exits 0.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const PORT = Number(process.env.FLOW_VIEWER_PORT) || 4777;
const SERVER_DIR = path.join(__dirname, '..', '..', 'server');
const SERVER = path.join(SERVER_DIR, 'server.js');
const LOG_DIR = process.env.FLOW_VIEWER_DIR || path.join(os.homedir(), '.claude', 'flow-viewer');

const build = () => { try { return require(path.join(SERVER_DIR, 'build-id.js'))(); } catch (_) { return ''; } };

function launch() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const out = fs.openSync(path.join(LOG_DIR, 'server.log'), 'a');
    const child = spawn(process.execPath, [SERVER], { detached: true, stdio: ['ignore', out, out], windowsHide: true });
    child.unref();
  } catch (_) { /* never fail the session */ }
  setTimeout(() => process.exit(0), 200);
}

function killOld() {
  // New servers answer /quit; very old ones do not, so fall back to killing whatever listens on the port (Windows).
  const r = http.request({ host: '127.0.0.1', port: PORT, path: '/quit', method: 'POST', timeout: 600 }, (res) => {
    res.resume();
    if (res.statusCode === 200) return setTimeout(launch, 400);
    hard();
  });
  r.on('error', hard); r.on('timeout', () => { r.destroy(); hard(); });
  r.end();
}
function hard() {
  try {
    if (process.platform === 'win32') {
      spawnSync('powershell', ['-NoProfile', '-Command', `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`], { timeout: 4000, windowsHide: true });
    } else {
      spawnSync('sh', ['-c', `lsof -ti tcp:${PORT} -sTCP:LISTEN | xargs -r kill`], { timeout: 3000 });
    }
  } catch (_) {}
  setTimeout(launch, 500);
}

const req = http.get({ host: '127.0.0.1', port: PORT, path: '/health', timeout: 500 }, (res) => {
  let b = ''; res.on('data', (c) => { b += c; });
  res.on('end', () => {
    let cur = ''; try { cur = JSON.parse(b).build; } catch (_) {}
    if (cur && cur === build()) process.exit(0); // same build already running
    killOld();
  });
});
req.on('timeout', () => { req.destroy(); launch(); });
req.on('error', launch);
setTimeout(() => process.exit(0), 6000).unref();
