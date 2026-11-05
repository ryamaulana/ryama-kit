// Logika Chat murni: web/src/app/lib/answers.ts (PRD F5, UX 5b).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questionAnswer, answerFailure, composerMode, panelItems, permissionAnswer, runNotice, topBarStatusText, canContinue, RULE_NOT_ALLOWED, ALREADY_ANSWERED } from '../web/src/app/lib/answers.js';

const any = (x: unknown) => x as any;
const qmsg = any({
  id: 'q1', kind: 'question', state: 'pending', createdAt: '2026-01-01T00:00:00Z', text: '', answer: null, sentOnResume: false,
  questions: [
    { question: 'Warna?', header: null, multiSelect: false, options: [{ label: 'Biru', description: null }] },
    { question: 'Fitur?', header: null, multiSelect: true, options: [{ label: 'A', description: 'x' }, { label: 'B', description: null }] },
  ],
});

test('questionAnswer: kunci teks pertanyaan, tunggal = string, multi = larik', () => {
  assert.deepEqual(questionAnswer(qmsg, { '0': ['Biru'], '1': ['A', 'B'] }), { kind: 'question', answers: { 'Warna?': 'Biru', 'Fitur?': ['A', 'B'] } });
});

test('answerFailure: 409 already_answered jadi "sudah dijawab", galat lain tetap pesan server', () => {
  assert.deepEqual(answerFailure({ status: 409, code: 'already_answered', message: 'x' }), { resolved: true, text: ALREADY_ANSWERED });
  assert.deepEqual(answerFailure({ status: 500, code: 'internal_error', message: 'rusak' }), { resolved: false, text: 'rusak' });
});

test('composerMode: desktop, dijeda, selesai bersesi melanjutkan, dihentikan, jalan', () => {
  assert.equal(composerMode('running', 's', 'desktop'), 'desktop');
  assert.equal(composerMode('paused', 's', 'dashboard'), 'paused');
  assert.equal(composerMode('done', 's', 'dashboard'), 'done');
  assert.equal(composerMode('done', null, 'dashboard'), 'stopped');
  assert.equal(composerMode('stopped', 's', 'dashboard'), 'stopped');
  assert.equal(composerMode('running', null, 'dashboard'), 'run');
});

test('panelItems: pertanyaan tunggal id berindeks, pesan queued bertanda, konflik 409 menciut, desktop disebut', () => {
  const owner = any({ id: 'o1', kind: 'owner', state: 'queued', text: 'halo', createdAt: '2026-01-01T00:00:01Z', sentOnResume: false, answer: null });
  const items = panelItems([qmsg, owner], [], new Set(['q1']));
  assert.equal(any(items[0]).questions[1].id, '1');
  assert.equal(any(items[0]).resolved.text, ALREADY_ANSWERED);
  assert.equal(any(items[1]).pending, 'Menunggu Lanjut');
  const desk = { ...qmsg, state: 'answered', answer: { from: 'desktop', answers: null, decision: null, reason: null } };
  assert.equal(any(panelItems([desk], [])[0]).resolved.text, 'Dijawab dari desktop');
});

const pmsg = any({ id: 'p1', kind: 'permission', state: 'pending', createdAt: '2026-01-01T00:00:00Z', text: 'x', answer: null, questions: null, sentOnResume: false, tool: { name: 'Bash', summary: 'npm test', why: 'perintah baru' } });

test('permissionAnswer: alasan hanya ikut pada tolak dan dipangkas; kosong tidak dikirim', () => {
  assert.deepEqual(permissionAnswer('allow'), { kind: 'permission', decision: 'allow' });
  assert.deepEqual(permissionAnswer('deny', '  jangan  '), { kind: 'permission', decision: 'deny', reason: 'jangan' });
  assert.deepEqual(permissionAnswer('deny', '   '), { kind: 'permission', decision: 'deny' });
  assert.deepEqual(permissionAnswer('always', 'x'), { kind: 'permission', decision: 'always' });
});

test('answerFailure: rule_not_allowed jadi pesan jelas, kartu tetap terbuka', () => {
  assert.deepEqual(answerFailure({ status: 400, code: 'rule_not_allowed', message: 'x' }), { resolved: false, text: RULE_NOT_ALLOWED });
});

test('panelItems: izin pending jadi kartu, pesan aturan membawa ruleId', () => {
  const rule = any({ id: 's1', kind: 'system', state: null, createdAt: '2026-01-01T00:00:01Z', text: 'Aturan disimpan untuk proyek ini: Bash npm', ref: { ruleId: 'r9' } });
  const [a, b] = panelItems([pmsg, rule], []);
  assert.deepEqual(a, { kind: 'permission', id: 'p1', from: 'orkestrator', tool: 'Bash', command: 'npm test', why: 'perintah baru', resolved: undefined });
  assert.equal(b.kind === 'system' && b.variant, 'rule');
  assert.equal(b.kind === 'system' && b.ruleId, 'r9');
});

test('runNotice: gagal = blok merah + Lanjutkan dengan alasan; limit = info dengan jam reset; jalan = tidak ada', () => {
  const failed = runNotice(any({ id: 'r', status: 'failed', reason: 'item x gagal 2x', lastLog: 'boom' }), null);
  assert.equal(failed?.kind === 'system' && failed.variant, 'bad');
  assert.equal(failed?.kind === 'system' && failed.continueRun, true);
  assert.deepEqual(failed?.kind === 'system' && failed.detail, [{ label: 'Alasan', value: 'item x gagal 2x' }, { label: 'Log terakhir', value: 'boom' }]);
  const off = runNotice(any({ id: 'r', status: 'disconnected', reason: null, lastLog: null }), null);
  assert.equal(off?.kind === 'system' && off.detail?.[0].value, 'Server berhenti saat run jalan.');
  const reset = new Date(2026, 0, 1, 17, 5).toISOString();
  const lim = runNotice(any({ id: 'r', status: 'limit_paused', reason: null, lastLog: null }), reset);
  assert.equal(lim?.kind === 'system' && lim.variant, 'limit');
  assert.match(lim?.kind === 'system' ? lim.text : '', /pukul 17\.05/);
  assert.equal(runNotice(any({ id: 'r', status: 'running' }), null), null);
});

test('topBarStatusText: alasan gagal, terputus, jam reset limit', () => {
  assert.equal(topBarStatusText(any({ status: 'failed', reason: 'item x gagal 2x' }), null), 'Gagal: item x gagal 2x');
  assert.match(topBarStatusText(any({ status: 'disconnected', reason: null }), null)!, /^Terputus/);
  assert.match(topBarStatusText(any({ status: 'limit_paused', reason: null }), new Date(2026, 0, 1, 9, 0).toISOString())!, /pukul 09\.00/);
  assert.equal(topBarStatusText(any({ status: 'running', reason: null }), null), undefined);
});

test('canContinue: hanya gagal/terputus, run terakhir, bukan desktop', () => {
  assert.equal(canContinue(any({ status: 'failed', origin: 'dashboard' }), true), true);
  assert.equal(canContinue(any({ status: 'disconnected', origin: 'dashboard' }), true), true);
  assert.equal(canContinue(any({ status: 'failed', origin: 'dashboard' }), false), false);
  assert.equal(canContinue(any({ status: 'failed', origin: 'desktop' }), true), false);
  assert.equal(canContinue(any({ status: 'stopped', origin: 'dashboard' }), true), false);
});
