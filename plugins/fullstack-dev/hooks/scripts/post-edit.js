#!/usr/bin/env node
// After an edit, remind the model of the right checks by file type/path. No dependencies.
// Each reminder fires once per session (UI) or once per file (security), so agents are not nagged on every edit.
const fs = require('fs');
const os = require('os');
const path = require('path');
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let ev = {};
  try { ev = JSON.parse(raw); } catch (_) { return; }
  const file = ((ev.tool_input || {}).file_path || '').replace(/\\/g, '/');
  if (!file) return;
  const agent = ev.agent_type || '';
  const stateFile = path.join(os.tmpdir(), `ryama-postedit-${(ev.session_id || 'x').replace(/[^\w-]/g, '')}.json`);
  let seen = {};
  try { seen = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (_) {}
  const out = [];
  const isUi = /\.(tsx|jsx|vue|svelte|css|scss|html)$/i.test(file) && !/(^|\/)(tests?|e2e|__tests__)\//i.test(file);
  // UI reminder: only for the main session / orchestrator, once per session. ui-designer, fe, qa, critic have their own flow.
  if (isUi && !agent && !seen.ui) {
    out.push(`UI file edited (${file}). If you are the orchestrator: visual work belongs to ui-designer (tokens from docs/design-tokens.css); new screens or layout changes get a ui-critic item. Do not design here.`);
    seen.ui = true;
  }
  const isSec = /(auth|login|session|upload|payment|billing|middleware|\.env|migration|schema)/i.test(file);
  seen.sec = seen.sec || {};
  if (isSec && !seen.sec[file] && !/cyber/i.test(agent)) {
    out.push(`Security-sensitive path (${file}). Make sure a cyber item (or cyber run) covers it with the matching security-checklists sections before finishing.`);
    seen.sec[file] = true;
  }
  if (!out.length) return;
  try { fs.writeFileSync(stateFile, JSON.stringify(seen)); } catch (_) {}
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: out.join(' ') } }));
});
