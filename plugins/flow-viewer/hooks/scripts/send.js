#!/usr/bin/env node
// Forwards the hook payload (stdin JSON) to the local flow-viewer server.
// Never fails or blocks Claude Code: short timeout, always exits 0.
const http = require('http');
const PORT = Number(process.env.FLOW_VIEWER_PORT) || 4777;

let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { body += c; });
process.stdin.on('end', () => {
  if (!body.trim()) process.exit(0);
  const req = http.request(
    { host: '127.0.0.1', port: PORT, path: '/event', method: 'POST', timeout: 800,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
    (res) => { res.resume(); res.on('end', () => process.exit(0)); }
  );
  req.on('timeout', () => { req.destroy(); process.exit(0); });
  req.on('error', () => process.exit(0));
  req.end(body);
});
setTimeout(() => process.exit(0), 1500).unref();
