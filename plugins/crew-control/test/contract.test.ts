import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TeamManifest, EvidenceManifest, ERROR_STATUS, countTokens, STATUS_LABEL, RunStatus, MODELS,
  AnswerRequestV2, SettingsRequest, ProjectSettingsRequest,
} from '../src/contract/index.js';

// Contoh disalin dari ARCHITECTURE 4.1 dan 4.3.
const team = {
  schema: 1, id: 'fullstack', name: 'Fullstack',
  agentDirs: ['agents', '../ui-designer-kit/agents'],
  orchestrator: { id: 'orkestrator', label: 'Orkestrator' },
  flow: {
    nodes: ['prd', 'ux', 'architect', 'backlog', 'ui-designer', 'fe', 'be', 'ui-critic', 'qa', 'cyber'],
    edges: [['prd', 'ux'], ['ux', 'architect'], ['architect', 'backlog'], ['backlog', 'ui-designer'], ['ui-designer', 'fe'],
      ['ui-designer', 'be'], ['fe', 'ui-critic'], ['be', 'qa'], ['ui-critic', 'qa'], ['qa', 'cyber']],
  },
  commands: [
    { id: 'ide', label: 'Mulai dari ide', kind: 'session', template: '/fullstack-dev:start {prompt}', needsText: true, placeholder: 'Aplikasi absensi untuk 3 cabang...' },
    { id: 'backlog', label: 'Lanjut backlog', kind: 'backlog', template: '/fullstack-dev:run {batchSize} --crew --milestone {milestone}{note}', needsText: false, placeholder: 'Catatan tambahan (opsional)' },
    { id: 'bebas', label: 'Prompt bebas', kind: 'session', template: '{prompt}', needsText: true, placeholder: 'Apa yang mau dikerjakan?' },
  ],
  backlog: { file: 'docs/backlog.json', cli: ['node', '{home}/.claude/skills/backlog/backlog.js'] },
  milestoneKinds: ['Fondasi', 'UI', 'Backend', 'Keamanan', 'Akhir'],
  evidence: { contract: 'skills/kontrak-bukti/SKILL.md', dir: 'docs/bukti' },
};
const evidence = {
  item: 't12-review',
  entries: [
    { kind: 'image', path: 'docs/bukti/t12-review/review-1440.png', caption: 'Review milestone di 1440 px, keadaan berat' },
    { kind: 'mermaid', path: 'docs/bukti/t12-review/alur.mmd', caption: 'Alur Setujui sampai milestone berikutnya' },
    { kind: 'tests', path: 'docs/bukti/t12-review/tes.json', caption: 'Tes review lulus' },
  ],
};

test('TeamManifest: contoh 4.1 valid', () => assert.ok(TeamManifest.safeParse(team).success));
test('TeamManifest: field ekstra, placeholder asing, edge ke node tak ada ditolak', () => {
  assert.ok(!TeamManifest.safeParse({ ...team, extra: 1 }).success);
  assert.ok(!TeamManifest.safeParse({ ...team, commands: [{ ...team.commands[0], template: '{prompt} {rm}' }] }).success);
  assert.ok(!TeamManifest.safeParse({ ...team, flow: { ...team.flow, edges: [['prd', 'hantu']] } }).success);
  assert.ok(!TeamManifest.safeParse({ ...team, orchestrator: { ...team.orchestrator, x: 1 } }).success);
});
test('EvidenceManifest: contoh 4.3 valid; ekstra dan path berbahaya ditolak', () => {
  assert.ok(EvidenceManifest.safeParse(evidence).success);
  assert.ok(!EvidenceManifest.safeParse({ ...evidence, extra: 1 }).success);
  for (const p of ['../rahasia.png', '/etc/passwd', 'C:\\x.png', 'a\\b.png']) {
    assert.ok(!EvidenceManifest.safeParse({ item: 'x', entries: [{ kind: 'image', path: p, caption: 'c' }] }).success, p);
  }
  assert.ok(!EvidenceManifest.safeParse({ item: 'x', entries: [{ kind: 'gif', path: 'a.gif', caption: 'c' }] }).success);
});
test('countTokens = input + output + cache tulis (cache baca tidak dihitung)', () => {
  assert.equal(countTokens({ input: 100, output: 50, cacheWrite: 30 }), 180);
});
test('STATUS_LABEL mencakup semua status; MODELS 3 alias', () => {
  for (const s of RunStatus.options) assert.ok(STATUS_LABEL[s], s);
  assert.deepEqual(MODELS.map((m) => m.id), ['opus', 'sonnet', 'haiku']);
});
test('kode galat 6.1: 32 kode, status HTTP sesuai dokumen', () => {
  assert.equal(Object.keys(ERROR_STATUS).length, 32);
  assert.equal(ERROR_STATUS.rate_limited, 429);
  assert.equal(ERROR_STATUS.unsupported_media_type, 415);
  assert.equal(ERROR_STATUS.file_not_allowed, 403);
  assert.equal(ERROR_STATUS.project_busy, 409);
});
test('permintaan: AnswerRequestV2, pengaturan, batas batchSize 1..20, ekstra ditolak', () => {
  assert.ok(AnswerRequestV2.safeParse({ kind: 'permission', decision: 'always' }).success);
  assert.ok(AnswerRequestV2.safeParse({ kind: 'milestone', decision: 'approve' }).success);
  assert.ok(!AnswerRequestV2.safeParse({ kind: 'milestone', decision: 'approve', x: 1 }).success);
  assert.ok(!AnswerRequestV2.safeParse({ kind: 'decision', answer: '' }).success);
  assert.ok(SettingsRequest.safeParse({ batchSize: 20 }).success);
  assert.ok(!SettingsRequest.safeParse({ batchSize: 21 }).success);
  assert.ok(!SettingsRequest.safeParse({ batchSize: 0 }).success);
  assert.ok(!ProjectSettingsRequest.safeParse({ extra: 1 }).success);
});
