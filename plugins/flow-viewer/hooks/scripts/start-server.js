#!/usr/bin/env node
// Starts the flow-viewer server in the background if it is not already running. Silent; always exits 0.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.FLOW_VIEWER_PORT) || 4777;
const SERVER = path.join(__dirname, '..', '..', 'server', 'server.js');
const LOG_DIR = process.env.FLOW_VIEWER_DIR || path.join(os.homedir(), '.claude', 'flow-viewer');

function launch() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const out = fs.openSync(path.join(LOG_DIR, 'server.log'), 'a');
    const child = spawn(process.execPath, [SERVER], {
      detached: true, stdio: ['ignore', out, out], windowsHide: true,
    });
    child.unref();
  } catch (_) { /* never fail the session */ }
  setTimeout(() => process.exit(0), 200);
}

const req = http.get({ host: '127.0.0.1', port: PORT, path: '/health', timeout: 500 }, (res) => {
  res.resume(); process.exit(0); // already running
});
req.on('timeout', () => { req.destroy(); launch(); });
req.on('error', launch);
