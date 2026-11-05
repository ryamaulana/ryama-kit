// Bentuk baris entitas v2 (ARCHITECTURE bagian 5). Dipakai Conductor; kontrak HTTP tetap di src/contract.
import type { Tokens } from '../contract/index.js';

export interface ProjectRow { id: string; path: string; name: string; teamId: string | null; batchSize: number | null; lastCommandId: string | null; lastActivityAt: string | null }
export interface SessionRow { id: string; runId: string; batchId: string | null; kind: 'batch' | 'turn' | 'continue' | 'desktop'; startedAt: string; endedAt: string | null; end: 'normal' | 'limit' | 'failed' | 'stopped' | 'disconnected' | 'detached' | null; modelUsed: string | null; tokens: Tokens }
export interface MilestoneRow { id: string; projectId: string; backlogKey: string; name: string; kind: string; status: 'proposed' | 'approved' | 'running' | 'ready_review' | 'accepted'; reviewRound: number; runId: string | null; initialItemCount: number; proposedAt: string | null; approvedAt: string | null; runningAt: string | null; readyReviewAt: string | null; acceptedAt: string | null }
export interface BatchRow { id: string; runId: string; milestoneId: string | null; number: number; sessionId: string | null; itemKeys: string[]; commitHash: string | null; commitError: string | null; startedAt: string; endedAt: string | null; tokens: Tokens }
export interface ItemRow { projectId: string; itemKey: string; milestoneId: string | null; title: string; agent: string | null; type: string | null; status: string; attempts: number; origin: 'asli' | 'perbaikan' | 'ditambah'; fixOf: string | null; firstSeenAt: string; doneAt: string | null; doneBatchId: string | null; tokens: Tokens }
/** Kolom tambahan run v2; objek penuh tetap di kolom json. */
export interface RunMeta { projectId?: string | null; teamId?: string | null; commandId?: string | null; title?: string; origin?: 'dashboard' | 'desktop' }
export interface EvidenceRow { id: string; projectId: string; itemKey: string; kind: string; path: string; caption: string; size: number; present: boolean; checkedAt: string }
export interface ActivityRow { id: string; runId: string; sessionId: string; agent: string; inTeam: boolean; itemKey: string | null; round: number; status: 'running' | 'done' | 'failed'; startedAt: string; endedAt: string | null; modelUsed: string | null; toolCount: number; files: string[]; tokens: Tokens }
export interface RuleRow { id: string; projectId: string; tool: string; pattern: string | null; createdFrom: string | null; createdAt: string; revokedAt: string | null }
export interface PushSubRow { endpoint: string; keys: Record<string, string>; label: string; createdAt: string; lastOkAt: string | null; failures: number }
export interface NotificationRow { key: string; runId: string; kind: string; sentAt: string; resolvedAt: string | null }
