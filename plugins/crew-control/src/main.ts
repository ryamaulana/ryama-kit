// Titik masuk: baca env, siapkan Store + Harness, jalankan server (default 127.0.0.1:4780).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ModelId } from './contract.js';
import { Harness } from './harness.js';
import { createApp } from './server.js';
import { Store } from './store.js';

const list = (s?: string) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const env = z.object({
  CREW_PORT: z.coerce.number().int().min(1).max(65535).default(4780),
  CREW_HOST: z.string().default('127.0.0.1'),
  CREW_WORK_ROOT: z.string().default('D:\\01_Workspace'),
  CREW_DB: z.string().default('data/crew.db'),
  CREW_DEFAULT_MODEL: ModelId.default('sonnet'),
  CREW_MAX_RUNS: z.coerce.number().int().min(1).max(3).default(1),
  CREW_CLAUDE_BIN: z.string().default('claude'),
  CREW_ALLOWED_HOSTS: z.string().optional(),
  CREW_ALLOWED_ORIGINS: z.string().optional(),
}).parse(process.env);

if (env.CREW_HOST === '0.0.0.0' || env.CREW_HOST === '::') {
  console.error('CREW_HOST tidak boleh 0.0.0.0 atau ::. Pakai 127.0.0.1 atau IP Tailscale (100.x.y.z).');
  process.exit(1);
}

const store = new Store(path.resolve(env.CREW_DB));
const stale = store.markDisconnected();
if (stale) console.log(`${stale} run dari sesi server sebelumnya ditandai Terputus.`);
const harness = new Harness({
  store, hookBaseUrl: `http://127.0.0.1:${env.CREW_PORT}`, bin: env.CREW_CLAUDE_BIN, maxRuns: env.CREW_MAX_RUNS,
});
const app = createApp({
  store, harness, workRoot: env.CREW_WORK_ROOT, maxRuns: env.CREW_MAX_RUNS, defaultModel: env.CREW_DEFAULT_MODEL,
  webDir: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web'),
  allowedHosts: list(env.CREW_ALLOWED_HOSTS), allowedOrigins: list(env.CREW_ALLOWED_ORIGINS),
});

const stopAll = async () => {
  harness.shutdown();
  await new Promise((r) => setTimeout(r, 500)); // beri waktu status Terputus tertulis
  await app.close().catch(() => {});
  store.close();
  process.exit(0);
};
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

await app.listen({ port: env.CREW_PORT, host: env.CREW_HOST });
console.log(`Crew Control server: http://${env.CREW_HOST}:${env.CREW_PORT} (folder kerja: ${env.CREW_WORK_ROOT}, maks ${env.CREW_MAX_RUNS} run)`);
