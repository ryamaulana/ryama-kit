#!/usr/bin/env node
// Injects routing rules into every session so the workflow never has to be re-explained.
const fs = require('fs');
const lines = [
  '[fullstack-dev plugin active]',
  'Flow: docs/PRD.md -> docs/ARCHITECTURE.md + docs/TASKS.md -> ui-designer (docs/DESIGN.md + docs/mockups, user approves) -> code -> qa -> cyber.',
  '- Source of truth is docs/PRD.md. Agents hand off through files in docs/, not chat history.',
  '- Delegate to subagents instead of doing their work here: prd, architect, ui-designer, fe, be, ui-critic, cyber, qa.',
  '- ALL visual/UI work goes to ui-designer. fe handles wiring/logic only.',
  '- Scope strictly to what the user asked ("boilerplate only", "ui only", "fe only"); add nothing extra.',
  '- After UI changes: Playwright screenshots -> ui-critic -> ui-designer fixes, max 2 rounds.',
  '- Code touching auth/uploads/payments/DB/secrets: run cyber before finishing.',
  '- End every task by listing which subagents were actually invoked.',
];
for (const f of ['docs/PRD.md', 'docs/DESIGN.md', 'docs/ARCHITECTURE.md', 'docs/TASKS.md']) {
  lines.push(`${fs.existsSync(f) ? 'Found' : 'Missing'}: ${f}`);
}
process.stdout.write(lines.join('\n') + '\n');
