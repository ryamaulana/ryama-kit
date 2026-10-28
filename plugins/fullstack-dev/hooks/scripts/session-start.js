#!/usr/bin/env node
// Injects routing rules into every session so the workflow never has to be re-explained.
const fs = require('fs');
const lines = [
  '[fullstack-dev plugin active]',
  'Flow: docs/PRD.md -> docs/UX.md -> ui-designer (konsep + rancangan + docs/design-tokens.css, user approves) -> docs/ARCHITECTURE.md -> backlog (docs/backlog.json) -> code -> ui-critic -> qa -> cyber.',
  '- Source of truth is docs/PRD.md. Agents hand off through files in docs/, not chat history.',
  '- Delegate to subagents instead of doing their work here: prd, architect, ui-designer, fe, be, ui-critic, cyber, qa.',
  '- ALL visual/UI work goes to ui-designer. fe handles wiring/logic only.',
  '- Delegating to ui-designer/ux/ui-critic: you are a courier, not a designer. Send ONLY the owner\'s own words quoted verbatim, the relevant doc paths, and the scope (screens/folder, Stage A/B, number of directions). NEVER write visual decisions (style, colors, fonts, layout, illustrations, section shapes or counts) and NEVER tell the agent to skip its steps or docs (DESIGN.md, concept, screen plan, audit). If the owner wants it fast, pass that on verbatim; the agent adapts.',
  '- Scope strictly to what the user asked ("boilerplate only", "ui only", "fe only"); add nothing extra.',
  '- After new screens or layout changes: ui-critic reviews against the concept/plan in DESIGN.md -> ui-designer applies one fix batch, max 2 rounds. Small edits after DESIGN.md is Approved use the ui-designer fast path, no critic.',
  '- Code touching auth/uploads/payments/DB/secrets: run cyber before finishing.',
  '- End every task by listing which subagents were actually invoked.',
];
for (const f of ['docs/PRD.md', 'docs/DESIGN.md', 'docs/ARCHITECTURE.md', 'docs/TASKS.md']) {
  lines.push(`${fs.existsSync(f) ? 'Found' : 'Missing'}: ${f}`);
}
process.stdout.write(lines.join('\n') + '\n');
