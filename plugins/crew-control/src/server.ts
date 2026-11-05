// Server HTTP: validasi di batas (zod dari contract.ts), format galat seragam, SSE, hook claude.
import fs from 'node:fs';
import path from 'node:path';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z, type ZodType } from 'zod';
import {
  AnswerRequest, ApiError, Config, EmptyBody, FolderListing, Message, MODELS, OwnerMessageRequest, Project, ProjectBoard, ProjectSettingsRequest,
  ProjectsQuery, Run, RunDetail, RunList, SettingsRequest, SettingsResponse,
  StartRunRequestV2, TERMINAL_STATUSES, Team, type ModelId,
} from './contract/index.js';
import { buildBoard, detail, findProject } from './board.js';
import { createCatalog } from './teams/catalog.js';
import { HarnessError, type Harness } from './harness/index.js';
import { browseFolder, createFolder, listProjects, projectId, PathError, resolveProject } from './projects.js';
import { installNetworkSecurity, isAllowedHost, isAllowedOrigin, isAllowedPeer, isLoopback } from './security.js';
import type { Store } from './store/index.js';

export interface AppOptions {
  store: Store;
  harness: Harness;
  workRoot: string;
  maxRuns: number;
  defaultModel?: ModelId; // default 'sonnet'
  /** Folder tim (CREW_TEAM_DIRS): tiap subfolder = satu plugin tim. */
  teamDirs?: string[];
  defaultBatchSize?: number; // default 5
  allowedHosts?: string[];
  allowedOrigins?: string[];
  /** CREW_TAILSCALE_USERS: login Tailscale yang boleh lewat Host *.ts.net. Kosong = tanpa cek. */
  tailscaleUsers?: string[];
  /** Folder berkas tampilan (index.html, app.js, lib.js). Tanpa ini, hanya API yang dilayani. */
  webDir?: string;
  /** Hasil build Vite (web/dist), dilayani di /app/. Tanpa ini, tidak dilayani. */
  distDir?: string;
}

/** docs/backlog.json ada dan masih punya item yang belum done. */
function openBacklog(dir: string): boolean {
  try {
    const b = JSON.parse(fs.readFileSync(path.join(dir, 'docs', 'backlog.json'), 'utf8'));
    return Array.isArray(b.items) && b.items.some((i: { status?: string }) => i.status !== 'done');
  } catch { return false; }
}

const err = (reply: FastifyReply, status: number, code: string, message: string, details?: Record<string, unknown>) =>
  reply.code(status).send({ error: { code, message, ...(details ? { details } : {}) } } satisfies ApiError);

/** Respons divalidasi terhadap kontrak sebelum keluar. */
const ok = <T>(reply: FastifyReply, schema: ZodType<T>, data: unknown, status = 200) => reply.code(status).send(schema.parse(data));

function parse<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    throw new HarnessError('invalid_request', 'Permintaan tidak valid.', 400, {
      issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return r.data;
}

export function createApp(o: AppOptions): FastifyInstance {
  const app = Fastify({ bodyLimit: 64 * 1024, logger: false });
  const { store, harness } = o;
  const catalog = createCatalog(o.teamDirs ?? []);
  harness.teamAgentsOf = (id) => catalog.get(id)?.agents.map((a) => a.id) ?? null;

  // ---- Lapisan keamanan (semua rute) ----
  app.addHook('onRequest', async (req, reply) => {
    reply.header('x-content-type-options', 'nosniff').header('cache-control', 'no-store');
    if (!isAllowedPeer(req.socket.remoteAddress)) return err(reply, 403, 'forbidden_peer', 'Hanya localhost atau Tailscale.');
    if (!isAllowedHost(req.headers.host, o.allowedHosts)) return err(reply, 403, 'forbidden_host', 'Host tidak diizinkan.');
    if (req.headers['sec-fetch-site'] === 'cross-site') return err(reply, 403, 'forbidden_origin', 'Permintaan lintas situs ditolak.');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      if (origin && !isAllowedOrigin(origin, req.headers.host, o.allowedOrigins)) return err(reply, 403, 'forbidden_origin', 'Origin tidak diizinkan.');
      if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
        return err(reply, 415, 'unsupported_media_type', 'Content-Type harus application/json (kirim {} bila tanpa isi).');
      }
    }
  });

  installNetworkSecurity(app, { tailscaleUsers: o.tailscaleUsers }); // pengguna Tailscale, batas laju, CSP

  app.setErrorHandler((e: any, _req, reply) => {
    if (e instanceof HarnessError) return err(reply, e.status, e.code, e.message, e.details);
    if (e instanceof PathError) return err(reply, e.code === 'folder_exists' ? 409 : 400, e.code, e.message);
    if (e instanceof z.ZodError) return err(reply, 500, 'internal_error', 'Galat internal.'); // respons gagal kontrak: bug server
    if (e.statusCode && e.statusCode < 500) return err(reply, e.statusCode, 'invalid_request', 'Permintaan tidak valid.');
    console.error(e); // detail hanya di log server, tidak ke klien
    return err(reply, 500, 'internal_error', 'Galat internal.');
  });
  app.setNotFoundHandler((_req, reply) => err(reply, 404, 'not_found', 'Rute tidak ditemukan.'));

  if (o.distDir && fs.existsSync(o.distDir)) {
    // Tanpa daftar isi folder dan tanpa dotfile.
    void app.register(fastifyStatic, { root: o.distDir, prefix: '/app/', index: 'app.html', list: false, dotfiles: 'deny', wildcard: true });
  }

  // ---- Berkas tampilan: hanya nama berkas di webDir (satu tingkat), tanpa path dari klien ----
  if (o.webDir) {
    const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
    const serve = (name: string, reply: FastifyReply) => {
      const type = types[path.extname(name)];
      if (!type || name !== path.basename(name) || !fs.existsSync(path.join(o.webDir!, name))) return err(reply, 404, 'not_found', 'Rute tidak ditemukan.');
      return reply.type(type).send(fs.readFileSync(path.join(o.webDir!, name)));
    };
    app.get('/', async (_req, reply) => serve('index.html', reply));
    app.get('/:file', async (req, reply) => serve((req.params as { file: string }).file, reply));
  }

  // ---- API ----
  app.get('/api/health', async () => ({ ok: true }));

  const defaultModel = o.defaultModel ?? 'sonnet';
  const defBatch = o.defaultBatchSize ?? 5;
  app.get('/api/config', async (_req, reply) =>
    ok(reply, Config, {
      workRoot: o.workRoot, projects: listProjects(o.workRoot), models: MODELS, defaultModel, maxRuns: o.maxRuns, permissionMode: 'A3',
      defaultBatchSize: o.defaultBatchSize ?? 5, teams: catalog.list(),
    }));

  app.get('/api/teams/:id', async (req, reply) => {
    const team = catalog.get((req.params as { id: string }).id);
    if (!team) throw new HarnessError('not_found', 'Tim tidak ditemukan.', 404);
    return ok(reply, Team, team);
  });

  // Jelajah bertahap: tanpa ?path = folder kerja. Path divalidasi seperti proyek (di dalam folder kerja, symlink diselesaikan).
  const withProject = (l: ReturnType<typeof browseFolder>) => {
    const hasRuns = store.listRuns(l.path, 1).length > 0;
    const hasOpenBacklog = openBacklog(l.path);
    return {
      ...l,
      folders: l.folders.map((f) => ({ ...f, activeRunId: harness.activeRunId(f.path) })),
      project: hasRuns || hasOpenBacklog
        ? { id: projectId(l.path), lastCommandId: null, hasOpenBacklog, activeRunId: harness.activeRunId(l.path) }
        : null,
    };
  };

  app.get('/api/folders', async (req, reply) => {
    const { path: p } = parse(z.object({ path: z.string().min(1).max(500).optional() }), req.query);
    return ok(reply, FolderListing, withProject(browseFolder(o.workRoot, p)));
  });

  app.post('/api/folders', async (req, reply) => {
    const body = parse(z.object({ parent: z.string().min(1).max(500), name: z.string().min(1).max(100) }).strict(), req.body);
    return ok(reply, FolderListing, withProject(createFolder(o.workRoot, body.parent, body.name)), 201);
  });

  // ---- Proyek dan pengaturan ----
    const projectOr404 = (id: string) => {
    const p = findProject(store, id);
    if (!p) throw new HarnessError('not_found', 'Proyek tidak ditemukan.', 404);
    return p;
  };
  app.get('/api/projects', async (req, reply) => {
    const q = parse(ProjectsQuery, req.query);
    return ok(reply, ProjectBoard, buildBoard(store, o.workRoot, o.maxRuns, q.recent));
  });
  app.get('/api/projects/:id', async (req, reply) =>
    ok(reply, Project, detail(store, o.workRoot, defBatch, projectOr404((req.params as { id: string }).id))));
  app.put('/api/projects/:id/settings', async (req, reply) => {
    const p = projectOr404((req.params as { id: string }).id);
    const body = parse(ProjectSettingsRequest, req.body);
    if (body.teamId !== undefined && !catalog.get(body.teamId)) throw new HarnessError('team_not_found', 'Tim tidak ditemukan.', 400);
    store.saveProject({ id: p.id, path: p.path, name: p.name, lastActivityAt: p.lastActivityAt, lastCommandId: store.getProject(p.id)?.lastCommandId ?? null,
      teamId: body.teamId ?? p.teamId, batchSize: body.batchSize ?? p.batchSize });
    return ok(reply, Project, detail(store, o.workRoot, defBatch, projectOr404(p.id)));
  });
  app.put('/api/settings', async (req, reply) => {
    const { batchSize } = parse(SettingsRequest, req.body);
    store.setSetting('batchSize', String(batchSize));
    return ok(reply, SettingsResponse, { batchSize });
  });

  app.post('/api/runs', async (req, reply) => {
    const body = parse(StartRunRequestV2, req.body);
    const projectDir = resolveProject(o.workRoot, body.project);
    const team = catalog.get(body.teamId);
    if (!team) throw new HarnessError('team_not_found', 'Tim tidak ditemukan.', 400);
    if (!team.valid) throw new HarnessError('team_invalid', 'Definisi tim rusak, perbaiki dulu.', 400, { error: team.error });
    const cmd = catalog.command(team, body.commandId);
    if (!cmd) throw new HarnessError('command_not_found', 'Perintah tidak ada di tim ini.', 400);
    if (cmd.needsText && !body.prompt) throw new HarnessError('command_needs_text', 'Perintah ini perlu teks.', 400);
    if (cmd.kind === 'backlog' && !fs.existsSync(path.join(projectDir, 'docs', 'backlog.json'))) {
      throw new HarnessError('no_backlog', 'Folder ini belum punya docs/backlog.json.', 409);
    }
    const pid = projectId(projectDir);
    // shortcut: hanya {prompt} dan {batchSize} diisi; {milestone}/{note}/{home} menunggu item orkestrasi.
    const prompt = cmd.template.replaceAll('{prompt}', body.prompt).replaceAll('{batchSize}', String(store.getProject(pid)?.batchSize ?? defBatch));
    const run = harness.startRun({ projectDir, prompt, model: body.model ?? defaultModel,
      meta: { projectId: pid, teamId: team.id, commandId: cmd.id, title: body.prompt.slice(0, 80) || cmd.label, origin: 'dashboard' } });
    const old = store.getProject(pid);
    store.saveProject({ id: pid, path: projectDir, name: path.basename(projectDir), teamId: old?.teamId ?? team.id, batchSize: old?.batchSize ?? null,
      lastCommandId: cmd.id, lastActivityAt: run.startedAt });
    return ok(reply, Run, run, 201);
  });

  app.get('/api/runs', async (req, reply) => {
    const { project } = parse(z.object({ project: z.string().max(500).optional() }), req.query);
    return ok(reply, RunList, { runs: store.listRuns(project ? resolveProject(o.workRoot, project) : undefined) });
  });

  const runOr404 = (id: string) => {
    const run = store.getRun(id);
    if (!run) throw new HarnessError('not_found', 'Run tidak ditemukan.', 404);
    return run;
  };

  app.get('/api/runs/:id', async (req, reply) => {
    const run = runOr404((req.params as { id: string }).id);
    return ok(reply, RunDetail, { run, messages: store.listMessages(run.id) });
  });

  app.post('/api/runs/:id/messages', async (req, reply) => {
    const { text } = parse(OwnerMessageRequest, req.body);
    const id = (req.params as { id: string }).id;
    const run = store.getRun(id);
    if (run && TERMINAL_STATUSES.includes(run.status)) resolveProject(o.workRoot, run.project); // folder harus masih sah sebelum sesi dilanjutkan
    return ok(reply, Message, harness.sendMessage(id, text), 201);
  });

  app.post('/api/runs/:id/messages/:mid/answer', async (req, reply) => {
    const p = req.params as { id: string; mid: string };
    return ok(reply, Message, harness.answer(p.id, p.mid, parse(AnswerRequest, req.body)));
  });

  for (const action of ['pause', 'resume', 'stop'] as const) {
    app.post(`/api/runs/:id/${action}`, async (req, reply) => {
      parse(EmptyBody, req.body);
      return ok(reply, Run, harness[action]((req.params as { id: string }).id));
    });
  }

  // SSE: event berurutan (id = seq). Tanpa ?after memutar ulang dari awal; EventSource mengirim Last-Event-ID saat menyambung ulang.
  app.get('/api/runs/:id/events', (req, reply) => {
    const run = runOr404((req.params as { id: string }).id);
    const q = parse(z.object({ after: z.coerce.number().int().min(0).optional() }), req.query);
    const last = Number(req.headers['last-event-id']);
    const after = q.after ?? (Number.isInteger(last) && last > 0 ? last : 0);
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive',
      'x-content-type-options': 'nosniff', 'x-accel-buffering': 'no',
    });
    res.write(': terhubung\n\n');
    const off = store.replayAndSubscribe(run.id, after, (e) => {
      res.write(`id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e.data)}\n\n`);
    });
    const beat = setInterval(() => res.write(': ping\n\n'), 15000);
    req.raw.on('close', () => { clearInterval(beat); off(); });
  });

  // Hook claude (PreToolUse untuk Jeda). Hanya dari mesin ini; token acak per run ada di path.
  app.post('/hook/:token', async (req, reply) => {
    if (!isLoopback(req.socket.remoteAddress)) return err(reply, 403, 'forbidden_peer', 'Hook hanya dari localhost.');
    return reply.send(await harness.hook((req.params as { token: string }).token, req.body));
  });

  return app;
}
