#!/usr/bin/env node
// After an edit, remind the model of the right checks by file type/path. No dependencies.
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let file = '';
  try { file = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch (_) { return; }
  if (!file) return;
  const f = file.replace(/\\/g, '/');
  let msg = '';
  if (/\.(tsx|jsx|vue|svelte|css|scss|html)$/i.test(f)) {
    msg = `UI file edited (${f}). Visual changes belong to ui-designer and must follow docs/DESIGN.md tokens. Before finishing: Playwright screenshots, ui-critic review, max 2 fix rounds.`;
  }
  if (/(auth|login|session|upload|payment|billing|middleware|\.env|migration|schema)/i.test(f)) {
    msg += ` Security-sensitive path (${f}). Run the cyber agent with the matching security-checklists sections before finishing.`;
  }
  if (!msg) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg.trim() },
  }));
});
