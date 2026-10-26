#!/usr/bin/env node
// Logs every subagent start to .claude/agent-log.txt in the project, as proof of which agents really ran.
const fs = require('fs');
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const ev = JSON.parse(raw);
    const name = ev.agent_type || ev.subagent_type || 'unknown';
    fs.mkdirSync('.claude', { recursive: true });
    fs.appendFileSync('.claude/agent-log.txt', `${new Date().toISOString()} subagent_start ${name}\n`);
  } catch (_) { /* never fail the session */ }
});
