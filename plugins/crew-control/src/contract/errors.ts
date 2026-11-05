import { z } from 'zod';

export const ApiError = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional() }),
});
export type ApiError = z.infer<typeof ApiError>;

// Kode galat bagian 6.1 ARCHITECTURE (`forbidden_*` dijabarkan: forbidden_user, forbidden_peer, forbidden_hook).
export const ERROR_STATUS = {
  invalid_request: 400, invalid_project: 400, project_not_found: 400, project_outside_root: 400,
  invalid_folder_name: 400, folder_exists: 409, team_not_found: 400, team_invalid: 400,
  command_not_found: 400, command_needs_text: 400, not_found: 404, project_busy: 409, capacity: 409,
  run_not_active: 409, run_read_only: 409, run_active: 409, invalid_transition: 409, desktop_no_prompt: 409, already_answered: 409,
  wrong_kind: 400, invalid_answer: 400, rule_not_allowed: 400, milestone_not_ready: 409, no_backlog: 409,
  item_not_in_milestone: 400, file_not_allowed: 403, push_endpoint_rejected: 400, rate_limited: 429,
  forbidden_user: 403, forbidden_peer: 403, forbidden_hook: 403, unsupported_media_type: 415, internal_error: 500,
} as const;
export type ErrorCode = keyof typeof ERROR_STATUS;
export const ErrorCode = z.enum(Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]]);
