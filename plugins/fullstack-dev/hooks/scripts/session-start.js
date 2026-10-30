#!/usr/bin/env node
// Injects routing rules into sessions of fullstack projects so the workflow never has to be re-explained.
// Silent in folders that are not kit projects (no docs/PROJECT.md, no PRD, no docs/ folder).
const fs = require('fs');
const has = (f) => { try { return fs.existsSync(f); } catch (_) { return false; } };
let prd = '';
try {
  const m = fs.readFileSync('docs/PROJECT.md', 'utf8').match(/^PRD:\s*(.+)$/m);
  if (m) prd = m[1].trim();
} catch (_) {}
if (!prd) prd = ['docs/PRD.md', 'PRD.md', 'docs/prd.md'].find(has) || '';
const isKitProject = prd || has('docs/PROJECT.md') || has('docs/DESIGN.md') || has('docs/backlog.json');
if (!isKitProject) {
  process.stdout.write('[fullstack-dev plugin available] Not a kit project here (no docs/PROJECT.md or PRD). For a new product use /fullstack-dev:start.\n');
  process.exit(0);
}
const lines = [
  '[fullstack-dev plugin active]',
  'Flow: PRD -> docs/UX.md -> ui-designer (konsep + rancangan + docs/design-tokens.css, user approves) -> docs/ARCHITECTURE.md -> backlog (docs/backlog.json) -> /fullstack-dev:run -> ui-critic -> qa -> cyber.',
  '- Agents hand off through files in docs/, not chat history. Find the PRD via skill project-context.',
  '- Delegate to subagents instead of doing their work here: prd, ux, architect, backlog, ui-designer, fe, be, ui-critic, cyber, qa.',
  '- ALL visual/UI work goes to ui-designer (mockups, then presentational components in the app). fe wires data/state/routing into them without changing markup or styles.',
  '- Delegating to ui-designer/ux/ui-critic: you are a courier, not a designer. Send ONLY the owner\'s own words quoted verbatim, the relevant doc paths, and the scope. NEVER write visual decisions and NEVER tell the agent to skip its steps or docs.',
  '- Scope strictly to what the user asked; add nothing extra.',
  '- Code touching auth/uploads/payments/DB/secrets: a cyber item must cover it.',
  '- End every task by listing which subagents were actually invoked.',
  '- One session = one backlog batch. After a /fullstack-dev:run batch is reported, do not start another batch here; tell the owner to /clear and run /fullstack-dev:run again (this session context is re-read on every turn).',
  `PRD: ${prd || 'not found yet (run prd agent)'}`,
];
for (const f of ['docs/UX.md', 'docs/DESIGN.md', 'docs/ARCHITECTURE.md', 'docs/backlog.json']) lines.push(`${has(f) ? 'Found' : 'Missing'}: ${f}`);
process.stdout.write(lines.join('\n') + '\n');
