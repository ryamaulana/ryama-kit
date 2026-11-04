# ARCHITECTURE · Crew Control

Status: v1 · 2026-11-04 · Sumber: `docs/PRD.md` v1.0 Locked, `docs/UX.md` v1, `docs/DESIGN.md` arah B (Approved), `docs/SPIKE.md` (bukti A1/A2), kode irisan tipis (`src/`, `web/`, `test/`, 50 tes).
Bila dokumen bertentangan: PRD > UX > DESIGN > dokumen ini. Di kode, skema zod di `src/contract/` menang atas teks ini (lalu teks ini diperbarui).

**Prinsip:** membangun di atas irisan tipis, bukan menulis ulang. Harness, Store, policy A3, pembatasan folder kerja, lapisan keamanan HTTP, dan format galat tetap; mereka diperluas. Yang diganti hanya tampilan polos `web/` (memang dibuat sebagai bahan, lihat SPIKE.md) menjadi aplikasi React.

---

## 1. Stack

| Bagian | Pilihan | Alasan satu baris |
|---|---|---|
| Runtime | Node.js 22 (>= 22.13), Windows | Sudah terpasang (22.17); `node:sqlite` tanpa flag; spike dan irisan berjalan di sini |
| Bahasa | TypeScript 7 (`tsc --noEmit`), dijalankan lewat `tsx` | Sudah dipakai irisan; satu bahasa untuk server, kontrak, dan tampilan |
| Server HTTP | Fastify 5 | Sudah dipakai; ringan, hook `onRequest` menampung lapisan keamanan |
| Kendali agent | Program `claude` asli: `-p` stream-json + tuan rumah izin stdio + hook HTTP (ADR 0001) | Satu-satunya jalur yang sah untuk login langganan (A1) dan terbukti di spike (A2) |
| Penyimpanan | SQLite bawaan (`node:sqlite`, WAL) di balik modul Store | Tanpa instalasi; satu berkas `data/crew.db`; migrasi berversi sudah ada |
| Kontrak data | zod 4, satu modul `src/contract/` | Server memvalidasi, tampilan mengimpor tipenya; sudah dipakai irisan |
| Live | SSE per run (sudah ada) + polling 3 dtk untuk daftar proyek | Satu arah cukup; lancar lewat Tailscale; tanpa WebSocket |
| Tampilan | React 19 + Vite 6 + React Router 7 + TanStack Query 5 | 7 layar dengan state live dan tiga kolom; Vite memberi build ringan dan proxy dev |
| Peta jalur | `@xyflow/react` (hanya kanvas: zoom, geser, pas layar) + simpul/ruas kustom; tata letak dihitung fungsi murni sendiri | AC F4 minta zoom/geser/pas layar; bentuk stasiun DESIGN B tidak cocok dengan simpul bawaan |
| Teks agent | `react-markdown` + `remark-gfm`, HTML mentah dimatikan | Markdown aman (UX 5b) tanpa sanitasi manual |
| Diagram bukti | `mermaid` (securityLevel `strict`), dimuat malas di layar Review/Detail | AC F7 "Mermaid dirender"; berat, jadi hanya dimuat saat ada diagram |
| Grafik bukti | SVG sendiri (garis + label langsung) | DESIGN minta garis tinta sederhana; pustaka grafik tidak sepadan |
| Push HP | Web Push (`web-push`, kunci VAPID dibuat sekali di `data/`) + service worker tulisan tangan | Satu-satunya cara push ke PWA saat browser tertutup (F6) |
| Akses HP | `tailscale serve` (HTTPS `*.ts.net`) ke `127.0.0.1:4780` | HTTPS wajib untuk push dan pemasangan PWA; server tetap hanya di loopback |
| Tes | `node:test` + `tsx` (sudah ada), `claude` tiruan `test/fake-claude.mjs`; e2e oleh `qa` lewat Playwright | Tanpa pustaka tes baru; claude tiruan membuat tes harness cepat dan deterministik |
| Font | Overpass + Overpass Mono, berkas lokal di `web/public/fonts/` | DESIGN B; tanpa CDN (alat lokal, juga offline) |

Dependensi baru (dipin di `package.json`, `npm audit` sebelum rilis): `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `@xyflow/react`, `react-markdown`, `remark-gfm`, `mermaid`, `web-push`, `@fastify/static`; dev: `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `@types/web-push`, `concurrently`.

---

## 2. Modul dan seam

Kosakata: modul = antarmuka + implementasi; **dalam** = banyak perilaku di balik antarmuka kecil; seam = tempat perilaku bisa diganti tanpa mengedit pemanggil. Seam hanya dibuat bila ada dua adapter nyata (tes atau produksi).

| Modul | Antarmuka (yang perlu diketahui pemanggil) | Yang disembunyikan | Seam / adapter | Status |
|---|---|---|---|---|
| **Store** `src/store/` | `save*/get*/list*` per entitas, `replayAndSubscribe(runId, after, fn)`, `subscribeAll(fn)`, `query.*` untuk Kesehatan kit | SQL, migrasi `user_version`, urutan event `seq`, bus event | Satu adapter (SQLite, `:memory:` di tes) | Ada; tambah tabel (bagian 5) dan `subscribeAll` |
| **Harness** `src/harness/` | `launch(spec): SessionHandle`, `answer`, `sendMessage`, `pause`, `resume`, `stop`, `hook(token, body)`, `isOwnSession(id)`, `shutdown()`; keluar: callback `onSessionEnd(outcome)` | Protokol stream-json, `control_request`, penahan Jeda, pohon proses Windows, deteksi limit, pelepasan Jeda > 50 mnt, ekor stderr | `bin` + `binArgs`: `claude` asli dan `test/fake-claude.mjs` | Ada; dipecah: `session.ts` (proses), `stream.ts` (parser), `limits.ts` |
| **Conductor** `src/conductor/` | `start(runSpec)`, `continueRun(runId)` (Lanjutkan), `chat(runId, text)`, `approveMilestone`, `requestFixes`, `answerDecision` | Mesin status run, batch, milestone, commit, jadwal jeda limit, pemulihan setelah restart | Dua adapter alur: `FreeFlow` (prompt bebas, perintah sesi) dan `BacklogFlow` (batch + milestone) | Baru; logika "giliran selesai = run selesai" pindah dari Harness ke `FreeFlow` |
| **TeamCatalog** `src/teams/` | `list(): TeamSummary[]`, `get(id): Team \| TeamError`, `agentOf(team, name)` | Pencarian `*/crew/team.json`, parse frontmatter `agents/*.md`, validasi, pesan galat berkas+bagian | Folder tim dari env (`CREW_TEAM_DIRS`): kit asli dan `test/fixtures/teams` | Baru |
| **BacklogPort** `src/backlog/` | `snapshot(projectDir, team): BacklogSnapshot \| null`, `diff(a, b)`, `apply(projectDir, team, ops[])` | Membaca `docs/backlog.json`, memanggil skrip CLI tim (argv, tanpa shell), antrean tulis saat sesi jalan | Dari definisi tim; tes memakai backlog tiruan + skrip tiruan | Baru |
| **Evidence** `src/evidence/` | `scan(projectDir, itemIds): Evidence[]`, `open(evidenceId, asset?): FileStream` | Kontrak `bukti.json`, deteksi berkas hilang/besar, allowlist jenis, path aman | Satu adapter (disk) | Baru |
| **Git** `src/git.ts` | `commitBatch(dir, message): {hash} \| GitError`, `init(dir)` | `status --porcelain`, cek berkas rahasia, `add -A`, `commit`, terjemahan galat | Satu adapter; tes memakai repo sementara | Baru |
| **DesktopSessions** `src/desktop.ts` | `handle(hookBody): HookResponse` (bisa menunggu), `answer`, `stop` | Run asal desktop per `session_id`, menahan PermissionRequest sampai dijawab, deteksi "dijawab dari desktop", penggabungan dengan sesi Harness | Satu adapter; tes mengirim payload hook | Baru |
| **Transcripts** `src/transcripts.ts` | `usage(sessionId, transcriptPath?): SessionUsage` (token per pemanggilan agent, model terpakai) | Baca inkremental JSONL `~/.claude/projects`, dedupe pesan per id, atribusi `ITEM <id>` | Satu adapter; port dari `flow-viewer/server/tokens.js` | Baru |
| **Notifier** `src/notifier/` | Berlangganan Store; `subscribe(device)`, `unsubscribe` | Pemicu F6, dedupe per kunci, isi push, kirim ulang/hapus langganan mati | `PushSender`: `web-push` dan pengirim tiruan di tes | Baru |
| **KitHealth** `src/kit-health.ts` | `metrics(filter)`, `items(filter, page)`, `drill(metric, filter)`, `compare(a, b)` | Agregasi, periode pembanding, basis < 5, "belum ada data" vs 0, label "sebagian" | Murni di atas `Store.query` | Baru |
| **Policy** `src/policy.ts` | `decide(tool, input, projectDir, rules): allow \| ask(why, alwaysAllowed)` | Aturan A3, pola berisiko, aturan "Selalu setujui" | Murni | Ada; tambah parameter `rules` |
| **Projects** `src/projects.ts` | `resolveProject`, `browseFolder`, `createFolder(parent, name)`, `projectKey`, `projectId` | realpath, symlink keluar, batas 500, validasi nama | Murni + disk | Ada; tambah `createFolder`, `projectId` |
| **Security** `src/security.ts` | `isAllowedPeer/Host/Origin`, `isLoopback`, `tailnetUserOk` | Rentang Tailscale, DNS rebinding | Murni | Ada; tambah cek user Tailscale |

Tampilan (`web/src/app/lib/`, murni dan dites): `runState` (port `web/lib.js` `applyEvent`), `agentStates(team, activities, messages, run)`, `railLayout(flow, width)`, `chatItems(messages, tools)` (gabung langkah alat, kartu terjawab), `answers` (bentuk jawaban), `format` (Intl id-ID, token "78,4 rb"), `countTokens`.

Kenapa Conductor terpisah dari Harness: Harness tahu satu proses `claude`; Conductor tahu apa arti sebuah run (rangkaian sesi). Uji hapus: tanpa Conductor, aturan batch/limit/commit tersebar di Harness dan rute.

---

## 3. Struktur folder

```
plugins/crew-control/
  .claude-plugin/plugin.json      baru: Crew Control juga plugin Claude Code, untuk hook sesi desktop (F10)
  hooks/hooks.json                baru: hook HTTP ke http://127.0.0.1:4780/hook/desktop
  package.json  tsconfig.json  .env.example
  src/                            server (pemilik: be)
    main.ts                       titik masuk: env, Store, pemulihan, Harness, Conductor, server
    server.ts                     lapisan keamanan, galat seragam, pemasangan rute
    routes/                       runs.ts projects.ts teams.ts review.ts kit-health.ts push.ts hooks.ts static.ts
    contract/                     KONTRAK BERSAMA (zod): index.ts + common.ts runs.ts messages.ts projects.ts
                                  teams.ts review.ts evidence.ts kit-health.ts push.ts hooks.ts errors.ts
    harness/                      index.ts (kelas Harness, dari harness.ts) session.ts stream.ts limits.ts
    conductor/                    index.ts free-flow.ts backlog-flow.ts status.ts
    teams/                        catalog.ts agent-md.ts
    backlog/                      port.ts cli.ts
    evidence/                     scan.ts files.ts
    store/                        index.ts (kelas Store, dari store.ts) migrations.ts queries.ts
    git.ts desktop.ts transcripts.ts kit-health.ts policy.ts projects.ts security.ts
    notifier/                     index.ts webpush.ts
  web/                            aplikasi tampilan (Vite root)
    index.html  vite.config.ts
    public/                       manifest.webmanifest sw.js offline.html icons/ fonts/
    src/
      main.tsx                    router + QueryClient + tema awal
      ui/                         PRESENTASIONAL (pemilik: ui-designer)
        styles/                   tokens.css (impor docs/design-tokens.css) base.css
        parts/                    Station StatusDot Rail TrackSegments ChatCard PermissionCard MilestoneCard
                                  SystemLine Composer EvidenceCard Lightbox ...
        screens/                  ProjectListView NewRunView FolderPopover ProjectView TopBar AgentColumn
                                  RailMap Timeline ChatPanel AgentDetail ReviewView KitHealthView
                                  HistoryView CompareView SettingsPanel MobileProjectView NavRail TabBar
      app/                        LOGIKA (pemilik: fe)
        routes.tsx                peta rute UX bagian 4
        containers/               *Container.tsx: ambil data, state, aksi -> props layar ui/
        hooks/                    useRunStream useProjects useConfig useSettings useNotify useTitleBadge
                                  useDraft usePushSubscription
        lib/                      fungsi murni (dites di test/web-*.test.ts)
        api.ts                    fetch + ApiError; tipe dari @contract
  test/                           node:test; fake-claude.mjs; fixtures/ (teams/tiruan, backlog, transcripts, bukti)
  data/                           crew.db, vapid.json (tidak masuk git)
  docs/                           PRD UX DESIGN ARCHITECTURE KEPUTUSAN SPIKE adr/ mockups/
  spike/                          arsip spike
```

`web/index.html`, `web/app.js`, `web/lib.js` (tampilan polos) diganti aplikasi Vite; logika `lib.js` dipindah ke `web/src/app/lib/runState.ts` beserta tesnya. Selama migrasi, `web/` lama tetap dilayani sampai rute React pertama hidup (satu item, lalu dihapus).

**Penempatan komponen:**
- `web/src/ui/` milik **ui-designer**: komponen presentasional murni (props masuk, event keluar, tanpa fetch, tanpa router, tanpa localStorage). Tiap komponen layar punya tabel "Kontrak komponen" di laporannya dan satu baris di `docs/KOMPONEN.md`. Mockup arah B (`docs/mockups/arah-b/*.html`) diporting ke sini.
- `web/src/app/` milik **fe**: rute, container, hook, panggilan API, state, penanganan memuat/galat/kosong, aksesibilitas penyambungan. fe tidak mengubah markup/kelas/gaya di `ui/`; bila perlu varian visual baru, itu item ui-designer.

---

## 4. Kontrak antar-plugin

### 4.1 Definisi tim (F1) `[SEC]`
Tiap plugin tim menaruh `crew/team.json` (skema `TeamManifest` di `src/contract/teams.ts`). Dashboard tidak menulis nama agent, alur, atau perintah tim di kodenya.

```json
{
  "schema": 1,
  "id": "fullstack",
  "name": "Fullstack",
  "agentDirs": ["agents", "../ui-designer-kit/agents"],
  "orchestrator": { "id": "orkestrator", "label": "Orkestrator" },
  "flow": {
    "nodes": ["prd", "ux", "architect", "backlog", "ui-designer", "fe", "be", "ui-critic", "qa", "cyber"],
    "edges": [["prd","ux"],["ux","architect"],["architect","backlog"],["backlog","ui-designer"],
              ["ui-designer","fe"],["ui-designer","be"],["fe","ui-critic"],["be","qa"],["ui-critic","qa"],["qa","cyber"]]
  },
  "commands": [
    { "id": "ide", "label": "Mulai dari ide", "kind": "session", "template": "/fullstack-dev:start {prompt}", "needsText": true,
      "placeholder": "Aplikasi absensi untuk 3 cabang..." },
    { "id": "backlog", "label": "Lanjut backlog", "kind": "backlog", "template": "/fullstack-dev:run {batchSize} --crew --milestone {milestone}{note}",
      "needsText": false, "placeholder": "Catatan tambahan (opsional)" },
    { "id": "bebas", "label": "Prompt bebas", "kind": "session", "template": "{prompt}", "needsText": true,
      "placeholder": "Apa yang mau dikerjakan?" }
  ],
  "backlog": { "file": "docs/backlog.json", "cli": ["node", "{home}/.claude/skills/backlog/backlog.js"] },
  "milestoneKinds": ["Fondasi", "UI", "Backend", "Keamanan", "Akhir"],
  "evidence": { "contract": "skills/kontrak-bukti/SKILL.md", "dir": "docs/bukti" }
}
```
- Agent dibaca dari frontmatter `agentDirs/*.md`: `name`, `description` (peran), `model`, `skills`, `tools`. Flow hanya boleh memuat id yang ada. Agent yang dipanggil tapi tidak ada di definisi = "di luar tim" (tetap tercatat).
- Placeholder template: `{prompt}`, `{batchSize}`, `{milestone}`, `{note}` (` -- <teks>` bila ada), `{home}`. Tidak ada placeholder lain; nilai tidak pernah masuk shell (`cli` dijalankan dengan argv, `shell: false`).
- Definisi rusak: tim tampil di `/api/teams` dengan `valid: false` dan `error: { file, section, message }`; tidak bisa dipilih; tim lain tidak terpengaruh.
- Folder tim: env `CREW_TEAM_DIRS` (default: folder induk `plugins/` tempat Crew Control berada). Tes menambah `test/fixtures/teams` berisi tim tiruan satu agent (AC F1 kedua).

### 4.2 Perubahan kit tim Fullstack (dikerjakan sebagai item backlog, bukan kode dashboard)
1. `fullstack-dev/crew/team.json` (isi di atas).
2. Skrip backlog: field item `milestone`, `origin` (`asli|perbaikan|ditambah`), `fixOf`; larik `milestones: [{id, name, kind}]` di akar; `next/ready --milestone <id>`; `add --milestone --origin --fix-of`. Agent `backlog` mengusulkan milestone per scope saat menyusun backlog dan menandai item tambahan di tengah milestone.
3. `/fullstack-dev:run` mode `--crew`: lewati item `checkpoint` (dashboard yang menanyakannya, ADR 0002), tanpa pertanyaan commit, tanpa saran `/clear`; laporan akhir tetap.
4. Kontrak bukti (4.3) ditulis di `skills/kontrak-bukti/SKILL.md` kit dan dirujuk dari `team.json`, agent `fe`, `be`, `ui-designer`, `qa`, `cyber`.
5. `/fullstack-dev:run` di luar Crew Control tetap bekerja seperti sekarang (flag baru opsional).

### 4.3 Kontrak bukti (F8)
Tiap item selesai menulis `<proyek>/docs/bukti/<item-id>/bukti.json` (skema `EvidenceManifest`, `src/contract/evidence.ts`) dan berkasnya di folder yang sama atau path lain di dalam proyek:
```json
{ "item": "t12-review", "entries": [
  { "kind": "image",   "path": "docs/bukti/t12-review/review-1440.png", "caption": "Review milestone di 1440 px, keadaan berat" },
  { "kind": "mermaid", "path": "docs/bukti/t12-review/alur.mmd", "caption": "Alur Setujui sampai milestone berikutnya" },
  { "kind": "tests",   "path": "docs/bukti/t12-review/tes.json", "caption": "Tes review lulus" }
]}
```
| `kind` | Berkas | Dirender sebagai |
|---|---|---|
| `image` | png, jpg, webp, gif (<= 5 MB disarankan) | gambar; > 5 MB: kartu pratinjau (nama, ukuran) + Buka berkas asli |
| `mockup` | html (+ aset relatif di foldernya) | iframe sandbox; lihat penuh |
| `mermaid` | `.mmd` | SVG Mermaid strict |
| `chart` | `.json` `{ "type": "line"\|"bar", "x": [..], "series": [{ "name", "values": [..] }], "unit"? }` | garis/batang SVG berlabel langsung |
| `tests` | `.json` `{ "passed", "failed", "skipped"?, "command", "files": [..] }` | angka lulus/gagal + berkas tes |
| `summary` | `.md` (sebelum/sesudah, temuan keamanan, ringkasan diff) | markdown aman |
| `video` | mp4, webm | `<video preload="metadata">` + Buka berkas asli |

Jenis per pekerjaan: UI -> `image`/`mockup`; backend -> `mermaid` (struktur DB atau alur) + `tests`; stress -> `chart`; keamanan -> `summary`; tanpa visual -> `summary` sebelum/sesudah + `tests`. Item tanpa `bukti.json` atau tanpa entri = "tanpa bukti"; entri yang berkasnya tidak ada = "hilang" (path ditampilkan).

---

## 5. Data model

SQLite, satu berkas. Pola irisan dipertahankan: kolom terindeks untuk kueri + kolom `json` berisi objek kontrak lengkap (dibaca kembali tanpa pemetaan). Migrasi `user_version` 2 menambah tabel/kolom; data v1 (2 run uji) tetap terbaca (kolom baru diisi bawaan).

| Tabel (entitas PRD) | Kolom kunci | Relasi | Batasan |
|---|---|---|---|
| `projects` (Project) | `id` (12 hex dari sha1 `projectKey`), `path` (path nyata), `name`, `team_id`, `batch_size` (null = bawaan), `last_command_id`, `last_activity_at` | punya banyak runs, milestones, items, rules | `path` unik (case-insensitive di Windows lewat `projectKey`) |
| `runs` (Run) | `id`, `project_id`, `team_id`, `command_id`, `origin` (`dashboard\|desktop`), `model`, `status`, `title`, `started_at`, `ended_at`, `json` | milik project; punya sessions, batches, messages, activities, events | Maks satu run aktif per project (dijaga Harness/Conductor di memori + cek DB saat mulai); `origin=desktop` tidak dihitung kapasitas |
| `sessions` (Session) | `id` (session id Claude Code), `run_id`, `batch_id`, `kind` (`batch\|turn\|continue\|desktop`), `started_at`, `ended_at`, `end` (`normal\|limit\|failed\|stopped\|disconnected\|detached`), `model_used`, token 4 kolom | milik run | `id` unik global: dipakai menggabungkan hook dan harness (F10) |
| `milestones` (Milestone) | `id`, `project_id`, `backlog_key`, `name`, `kind`, `status` (`proposed\|approved\|running\|ready_review\|accepted`), `review_round`, `run_id` (run terakhir yang mengerjakan), `initial_item_count`, waktu tiap status | milik project; item lewat `items.milestone_id` | unik (`project_id`, `backlog_key`); hanya satu `running\|ready_review` per project |
| `batches` (Batch) | `id`, `run_id`, `milestone_id`, `number`, `session_id`, `item_keys` (json), `commit_hash`, `commit_error`, `started_at`, `ended_at`, token 4 kolom | milik run dan milestone | `number` naik per run |
| `items` (Item, cermin backlog) | (`project_id`, `item_key`) PK, `milestone_id`, `title`, `agent`, `type`, `status`, `attempts`, `origin` (`asli\|perbaikan\|ditambah`), `fix_of`, `first_seen_at`, `done_at`, `done_batch_id`, token 4 kolom | milik milestone | Sumber tetap `docs/backlog.json`; cermin hanya diperbarui dari snapshot |
| `evidence` (Evidence) | `id` (sha1 project+item+path), `project_id`, `item_key`, `kind`, `path` (relatif proyek), `caption`, `size`, `present`, `checked_at` | milik item | `path` harus di dalam proyek; jenis dari allowlist |
| `messages` (Message) | `id`, `run_id`, `kind`, `state`, `created_at`, `answered_at`, `ref_item`, `ref_milestone`, `json` | milik run | `answered_at - created_at` = waktu menunggu pemilik (F9); jawaban pertama menang (cek `state` dalam satu transaksi) |
| `agent_activity` (AgentActivity) | `id` (tool_use id pemanggil, atau `orkestrator:<session>`), `run_id`, `session_id`, `agent`, `in_team`, `item_key`, `round`, `status` (`running\|done\|failed`), `started_at`, `ended_at`, `model_used`, `tool_count`, `files` (json), token 4 kolom | milik session | `round` = putaran ke-n agent itu di run |
| `events` | `seq`, `run_id`, `type`, `at`, `json` | milik run | Sudah ada; tipe baru: `activity`, `batch`, `milestone` |
| `permission_rules` (Pengaturan) | `id`, `project_id`, `tool`, `pattern` (null = alat itu di dalam proyek), `created_from` (message id), `created_at`, `revoked_at` | milik project | Tidak pernah dibuat untuk kategori berisiko (hapus massal, push, reset, instal global, unduh-jalankan, perintah sistem) |
| `push_subscriptions` (Pengaturan per perangkat) | `endpoint` PK, `keys` (json), `label`, `created_at`, `last_ok_at`, `failures` | | Endpoint harus https dan host di allowlist layanan push |
| `notifications` | `key` PK (mis. `msg:<id>`, `run:<id>:ready_review:<round>`), `run_id`, `kind`, `sent_at`, `resolved_at` | | Pemicu yang sama tidak dikirim dua kali (F6) |
| `settings` | `key`, `value` | | `batch_size` bawaan (awal dari env), tidak ada rahasia |

Pengaturan per perangkat (tema, bunyi, folder/model/tim/perintah terakhir, draf, tampilan grafik/timeline, baris "Aktifkan pemberitahuan" ditutup) disimpan di `localStorage` perangkat itu, bukan di server (U3). Folder kerja hanya dari env, dibaca di layar. Kunci VAPID di `data/vapid.json`, bukan di DB.

**Status run** (enum sudah ada): `running`, `needs_owner`, `paused`, `limit_paused`, `ready_review`, `stopped`, `failed`, `done`, `disconnected`.
- Prioritas tampilan saat ada sesi: `paused` > `needs_owner` > `running`. `needs_owner` juga bila tidak ada sesi tetapi ada usulan milestone/keputusan backlog menunggu.
- `ready_review`, `limit_paused`, dan `needs_owner` tanpa sesi bertahan saat server restart (tidak ada proses yang hilang). Yang punya proses saat restart menjadi `disconnected`. (Perubahan dari `markDisconnected` irisan.)
- Kelanjutan: ketik di Chat hanya untuk run **terakhir** proyek berstatus `done` (A13); `failed`/`disconnected` lewat Lanjutkan; `stopped` dan run lama baca saja. Irisan masih mengizinkan ketik untuk `failed/stopped/disconnected`: diperketat.

**Token:** disimpan 4 jenis (input, output, cache baca, cache tulis). "Token" di semua layar = input + output + cache tulis (UX U2), dihitung di satu fungsi `countTokens` di `src/contract/common.ts`. Anthropic tidak menerbitkan rumus batas langganan, jadi definisi ini asumsi (T3) yang bisa diganti di satu tempat. Sumber angka: transkrip (`Transcripts`), bukan `result.usage` (yang hanya giliran terakhir).

---

## 6. API

### 6.1 Aturan umum (dari irisan, tetap berlaku)
- Semua dari localhost atau lewat `tailscale serve`; `Host` harus localhost/127.0.0.1/::1/`*.ts.net`/IP Tailscale/`CREW_ALLOWED_HOSTS`; `Origin` (bila ada) = Host atau `CREW_ALLOWED_ORIGINS`; `Sec-Fetch-Site: cross-site` ditolak. Bila `CREW_TAILSCALE_USERS` diisi, permintaan dengan Host `*.ts.net` wajib membawa `Tailscale-User-Login` yang ada di daftar itu (403 `forbidden_user`).
- Semua `POST/PUT/DELETE` wajib `Content-Type: application/json`; tanpa isi kirim `{}`. Badan maks 64 KB; field ekstra ditolak (`.strict()`).
- Galat: `{ "error": { "code", "message" (Indonesia), "details"? } }`. Tanpa stack trace ke klien.
- Teks agent (`text`, `question`, `label`, `description`, `tool.summary`, `reason`, `lastLog`, `caption`, judul item) = teks biasa; tampilan merender aman (6.4).
- Waktu ISO 8601 UTC. Id = UUID kecuali disebut lain. Pembatas laju: 60 permintaan pengubah/menit per alamat (429 `rate_limited`).
- Auth kolom di bawah: **J** = lapisan jaringan di atas (tanpa akun, PRD). **H** = hook: hanya loopback + token/penanda.

Kode galat (lama + baru): `invalid_request` 400 (`details.issues`), `invalid_project` `project_not_found` `project_outside_root` 400, `invalid_folder_name` 400, `folder_exists` 409, `team_not_found` `team_invalid` `command_not_found` 400, `command_needs_text` 400, `not_found` 404, `project_busy` 409 (`details.activeRunId`), `capacity` 409, `run_not_active` 409, `run_read_only` 409 (`details.latestRunId`), `run_active` 409, `desktop_no_prompt` 409, `already_answered` 409 (`details.state`, `details.answeredFrom`), `wrong_kind` `invalid_answer` 400, `rule_not_allowed` 400, `milestone_not_ready` 409, `no_backlog` 409, `item_not_in_milestone` 400, `file_not_allowed` 403, `push_endpoint_rejected` 400, `rate_limited` 429, `forbidden_*` 403, `unsupported_media_type` 415, `internal_error` 500.

### 6.2 Endpoint
Skema di kolom Request/Response adalah nama di `src/contract/`. "(ada)" = sudah di irisan; "(ubah)" = diperluas.

**Konfigurasi, tim, folder, proyek**

| Metode dan path | Request | Response | Galat | Auth |
|---|---|---|---|---|
| `GET /api/health` (ada) | | `{ ok: true }` | | J |
| `GET /api/config` (ubah) | | `Config`: `workRoot`, `models[{id,label,description}]`, `defaultModel`, `maxRuns`, `permissionMode:"A3"`, `defaultBatchSize`, `teams: TeamSummary[]` (`id,name,valid,error?,commands[{id,label,kind,needsText,placeholder}]`), `pushPublicKey \| null` | | J |
| `GET /api/teams/:id` | | `Team`: summary + `agents[{id,name,role,model,skills,tools}]`, `orchestrator`, `flow{nodes,edges}`, `milestoneKinds` | 404 | J |
| `GET /api/folders?path=` (ubah) | `path` opsional | `FolderListing` + per folder `activeRunId \| null`; + `project: { id, lastCommandId, hasOpenBacklog, activeRunId } \| null` untuk folder yang dibuka | `project_outside_root`, `project_not_found` | J |
| `POST /api/folders` | `{ parent: path, name: 1..100, tanpa \ / : * ? " < > \|, bukan . / .., bukan nama terlarang Windows }` | 201 `FolderListing` folder baru (sudah `git init`, A11) | `invalid_folder_name`, `folder_exists`, `project_outside_root` | J |
| `GET /api/projects` | `?recent=5` opsional | `ProjectBoard`: `totals{needsOwner, readyReview, active, maxRuns, failed, limitPaused, earliestReset}`, `projects[ProjectSummary]` (`id,name,relPath,path,origin,status,pending,oldestPendingAt,milestone{name,done,total,batch}\|null,activeAgents[],tokens,durationMs,lastActivityAt,latestRunId,limitResetAt,reason`) | | J |
| `GET /api/projects/:id` | | `Project`: summary + `batchSize`, `teamId`, `rules[{id,tool,pattern,createdAt}]`, `latestRunId`, `readyMilestoneId \| null` | 404 | J |
| `PUT /api/projects/:id/settings` | `{ batchSize?: 1..20, teamId? }` | `Project` | `team_not_found` | J |
| `DELETE /api/projects/:id/rules/:ruleId` | `{}` | 204 (Batalkan "Selalu setujui"; pesan sistem ditambah) | 404 | J |
| `PUT /api/settings` | `{ batchSize: 1..20 }` | `{ batchSize }` | | J |

**Run, Chat, kendali**

| Metode dan path | Request | Response | Galat | Auth |
|---|---|---|---|---|
| `POST /api/runs` (ubah) | `StartRunRequest`: `{ project, teamId, commandId, prompt: 0..20000 (wajib bila needsText), model? }` | 201 `Run` | `invalid_request`, path, `team_*`, `command_*`, `project_busy`, `capacity`, `no_backlog` (perintah backlog tanpa `docs/backlog.json`) | J |
| `GET /api/runs` (ubah) | `?project=<id\|path>&status=&team=&q=&origin=&cursor=&limit=1..100` | `RunList { runs: Run[], nextCursor \| null }` terbaru dulu | | J |
| `GET /api/runs/:id` (ubah) | | `RunDetail { run, messages, batches, milestone \| null, activities, isLatest }` | 404 | J |
| `GET /api/runs/:id/events` (ubah) | `?after` / `Last-Event-ID` | SSE (6.3) | 404 | J |
| `POST /api/runs/:id/messages` (ubah) | `{ text: 1..8000 }` | 201 `Message` (`owner`; `queued` saat Jeda; melanjutkan sesi bila run terakhir `done`) | `run_read_only`, `run_not_active`, `desktop_no_prompt`, `project_busy`, `capacity`, path | J |
| `POST /api/runs/:id/messages/:mid/answer` (ubah) | `AnswerRequest`: `question {answers}` \| `permission {decision: allow\|deny\|always, reason?}` \| `milestone {decision: approve}` \| `decision {answer: 1..2000}` (item checkpoint backlog) | 200 `Message` | `already_answered`, `wrong_kind`, `invalid_answer`, `rule_not_allowed` (always untuk kategori berisiko), `run_not_active` | J |
| `POST /api/runs/:id/pause` `resume` `stop` (ada) | `{}` | `Run` | `run_not_active`, 404; desktop: hanya `stop` | J |
| `POST /api/runs/:id/continue` | `{}` | `Run` (Lanjutkan: sesi baru di run sama; hanya `failed`/`disconnected`, run terakhir proyek, origin dashboard) | `run_read_only`, `run_not_active`, `project_busy`, `capacity`, path | J |
| `GET /api/runs/:id/agents/:agent` | | `AgentDetail { definition \| null, inTeam, modelDeclared, modelUsed, rounds: AgentActivity[], steps: ToolEvent[] (<= 200 terakhir), files[], tokens, durationMs, evidence: Evidence[] }` | 404 | J |
| `DELETE /api/runs/:id` | `{}` | 204 (data dashboard saja) | `run_active` | J |
| `GET /api/compare?a=&b=` | | `RunComparison { a: RunStats, b: RunStats, comparable, reason \| null }` (`RunStats`: token 4 jenis, durasi, item, token per item, menunggu pemilik, batch) | 404 | J |

**Review dan bukti**

| Metode dan path | Request | Response | Galat | Auth |
|---|---|---|---|---|
| `GET /api/milestones/:id` | | `Review { milestone, project, items[{ item, isFix, notes[], evidence[], noEvidence }], batches[], summary{ items, noEvidence, missing, tokens, durationMs, commits, files, previous{tokens,durationMs} \| null } }` | 404 | J |
| `POST /api/milestones/:id/approve` | `{}` | `Milestone` (`accepted`; milestone berikutnya mulai otomatis bila run masih aktif) | `milestone_not_ready`, `already_answered` | J |
| `POST /api/milestones/:id/fixes` | `{ notes: [{ itemId, note: 1..2000 }] 1..50 }` | `{ milestone, fixItems: Item[] }` (run lanjut otomatis) | `milestone_not_ready`, `item_not_in_milestone` | J |
| `GET /api/evidence/:id/file` | | berkas (tipe dari allowlist, `nosniff`; html dengan CSP `sandbox allow-scripts`) | `not_found` (beserta path hilang), `file_not_allowed` | J |
| `GET /api/evidence/:id/asset?path=<rel>` | | aset relatif mockup (css, js, gambar, font) di dalam folder mockup itu | `file_not_allowed`, 404 | J |

**Kesehatan kit, push, hook**

| Metode dan path | Request | Response | Galat | Auth |
|---|---|---|---|---|
| `GET /api/kit-health` | `?project=&team=&from=&to=` (bawaan 30 hari) | `KitHealth { range, previousRange, metrics[{ id, value \| null, base, previous \| null, partial, flagged }], issues[{ metric, text, link }], tokensPerMilestone[], byAgent[], waitByProject[], revisionsByAgent[] }` (null = "belum ada data") | | J |
| `GET /api/kit-health/items` | saringan + `sort, dir, page` (50/hal) | `{ items: HealthItemRow[], total }` | | J |
| `GET /api/kit-health/drill/:metric` | saringan | `{ rows: [{ label, value, runId, itemKey?, messageId?, milestoneId? }] }` | 404 | J |
| `POST /api/push/subscriptions` | `{ endpoint (https, host allowlist), keys{p256dh, auth}, label? }` | 201 | `push_endpoint_rejected` | J |
| `DELETE /api/push/subscriptions` | `{ endpoint }` | 204 | | J |
| `POST /hook/:token` (ada) | payload hook Claude Code (PreToolUse) | respons hook | `forbidden_peer` | H: loopback + token acak per sesi |
| `POST /hook/desktop` | payload hook (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PermissionRequest, SubagentStart, SubagentStop, Stop, SessionEnd) | respons hook (PermissionRequest ditahan sampai dijawab) | `forbidden_peer`, `forbidden_hook` | H: loopback + header `X-Crew-Hook: 1` |

Berkas tampilan: `GET /` dan rute aplikasi tanpa ekstensi -> `web/dist/index.html`; `GET /assets/*`, `/fonts/*`, `/sw.js`, `/manifest.webmanifest`, `/offline.html`, `/icons/*` dari `web/dist` lewat `@fastify/static` (tanpa daftar isi folder, tanpa dotfile).

### 6.3 Event SSE per run
`id: <seq>`, `event: <type>`, `data: <JSON>`; tanpa `after` diputar ulang dari awal; ping tiap 15 dtk (ada).
- `run`: `Run` penuh. Field baru `Run`: `projectId`, `teamId`, `commandId`, `title` (dari prompt/perintah), `origin: dashboard|desktop`, `batchSize`, `milestone {id,name,done,total} | null`, `batchNo`, `limitResetAt`, `tokens` (4 jenis, total run).
- `message`: `Message` penuh, ganti per `id`. Baru: `kind` + `milestone` (usulan milestone) dan `decision` (item checkpoint backlog); `source: session|backlog|desktop|system`; `ref {itemId?, milestoneId?, batchId?, ruleId?}`; `answer.from` + `desktop`; `answer.decision` + `always`; `proposal {milestoneId, name, items[{id,title}]}` untuk `milestone`.
- `tool` (ada): + `agent` (id agent atau `orkestrator`), `toolUseId`.
- `activity`: `AgentActivity` (mulai, selesai, gagal, token, model terpakai).
- `batch`: `Batch` (mulai, selesai, commit).
- `milestone`: `Milestone` (status berubah).

### 6.4 Render aman di tampilan `[SEC]`
React meng-escape teks; markdown lewat `react-markdown` tanpa HTML mentah; tautan ditampilkan sebagai teks + tombol Salin (tidak bisa diklik); Mermaid `securityLevel: 'strict'`; gambar dan SVG bukti lewat `<img>` (skrip SVG tidak jalan); mockup HTML di `<iframe sandbox="allow-scripts">` (asal opak, tanpa `allow-same-origin`).

---

## 7. Alur kunci

**A. Mulai run prompt bebas / perintah sesi (F2)**
1. Run baru memuat `GET /api/config` (model, tim, perintah) dan `GET /api/folders` (bawaan dari `localStorage`; bila tidak sah, kembali ke folder kerja + pesan satu baris).
2. `POST /api/runs` -> zod -> `resolveProject` -> TeamCatalog (tim sah, perintah ada, teks wajib) -> Conductor `FreeFlow.start`.
3. Conductor: cek satu run aktif per proyek dan kapasitas -> simpan Run -> render template perintah -> Harness `launch` (`--session-id` baru, model, `--permission-prompt-tool stdio`, hook Jeda).
4. Respons 201 < 1 dtk; fe pindah ke `/proyek/<id>` dan membuka SSE; event `system init` dan langkah pertama tiba (AC 5 dtk).
5. Giliran selesai -> `FreeFlow`: tidak ada pesan baru dalam 2 dtk -> sesi ditutup -> run `done`.

**B. Lanjut backlog sampai milestone (F3)**
1. `POST /api/runs` perintah `kind: backlog` -> `BacklogFlow.start`: `BacklogPort.snapshot`. Tanpa backlog: 409 `no_backlog`.
2. Ada milestone `proposed` (dari `milestones` di backlog, belum disetujui): pesan `milestone` di Chat, run `needs_owner` tanpa sesi. Backlog lama tanpa milestone: seluruh item tersisa diusulkan sebagai satu milestone "Backlog".
3. Pemilik Setujui -> milestone `running`. (Ubah = pemilik mengetik ke orkestrator; sesi singkat menjalankan agent backlog; snapshot dibaca ulang; usulan baru tampil.)
4. Per batch: snapshot sebelum -> Harness `launch` sesi baru dengan template `/fullstack-dev:run {batchSize} --crew --milestone <key>` -> sesi berakhir -> snapshot sesudah -> `diff` (item selesai, gagal, ditambah) -> Git `commitBatch` (pesan `crew: <milestone> batch <n> (<id item>)`) -> simpan Batch + pesan sistem "Batch n selesai" (tanpa pemberitahuan).
5. Keputusan berikutnya (berurutan): commit gagal -> `paused` + alasan; item `failed` (gagal 2x) -> run `failed` dengan item, agent, alasan; item checkpoint siap -> pesan `decision` (sesi berikutnya tetap jalan untuk item lain, karena mode `--crew` melewatinya); semua item milestone `done` -> milestone `ready_review`, run `ready_review` + pemberitahuan; tidak ada item tersisa di backlog -> run `done` "Backlog habis"; selain itu -> batch berikutnya.
6. Jawaban `decision` dicatat di DB lalu diterapkan (`backlog decide`) sebelum batch berikutnya dimulai, tidak saat sesi menulis `backlog.json` (hindari tabrakan tulis).

**C. Review milestone (F7)**
1. Notifikasi/baris "Siap review" -> `/proyek/<id>/review` -> `GET /api/milestones/:id`.
2. Server: item milestone dari cermin, `Evidence.scan` per item (hilang/besar dideteksi saat itu), ringkasan batch/commit, pembanding = milestone `accepted` terakhir sejenis (`kind`).
3. Setujui -> `accepted` -> BacklogFlow memilih milestone berikutnya (usulan bila belum disetujui; langsung jalan bila sudah) -> pesan sistem di Chat.
4. Kirim perbaikan (n) -> tiap catatan menjadi item `perbaikan` (`backlog add --milestone --origin perbaikan --fix-of`, argv) -> milestone `running`, `review_round + 1` -> batch jalan -> kembali `ready_review`, item perbaikan di depan dan ditandai.

**D. Pertanyaan, izin, Selalu setujui (F5)**
1. `can_use_tool` dari `claude`: `AskUserQuestion` -> pesan `question`; alat lain -> `Policy.decide(tool, input, project, rules)`: allow langsung, atau pesan `permission` dengan `why`.
2. Notifier: pemicu `msg:<id>` -> push + (di laptop) judul tab/bunyi/notifikasi dari polling.
3. Jawaban pertama menang (cek `state` + tulis dalam satu transaksi); perangkat kedua 409 `already_answered`.
4. `always`: izinkan sekarang + simpan aturan (`tool` + pola: path dalam proyek atau awalan perintah) bila kategorinya tidak berisiko; pesan sistem "Aturan disimpan untuk proyek ini" [Batalkan] -> `DELETE .../rules/:id`.
5. Dibatalkan `claude` (`control_cancel_request`) -> `cancelled` + `from: agent`; push diselesaikan (`resolved_at`).

**E. Jeda, Jeda > 50 menit, Stop, Lanjutkan (F2)**
1. Jeda: hook PreToolUse ditahan (ada). Setelah 50 mnt masih dijeda: Harness memutus giliran (`interrupt`), menutup proses, sesi `detached`; run tetap `paused`.
2. Lanjut: bila sesi masih hidup, lepas penahan (ada); bila `detached`, `launch --resume <session>` dengan pesan antrean atau "Lanjutkan.".
3. Stop: tolak permintaan tertunda, `interrupt`, tutup stdin 3 dtk, `taskkill /T /F` 6 dtk (ada); Conductor tidak memulai batch berikutnya; tidak ada commit.
4. Lanjutkan (`failed`/`disconnected`): FreeFlow -> `--resume <session terakhir>` dengan pesan "Lanjutkan pekerjaan sebelumnya."; BacklogFlow -> sesi batch baru dari status backlog (perintah run menangani item `running` yang tertinggal). Pesan sistem "Dilanjutkan di sesi baru".

**F. Jeda limit (F2, A5)**
1. `limits.ts` mengenali galat limit dari `result`/pesan sintetis `claude` dan membaca jam reset (format teks "resets 5pm (zona)" atau epoch); fixture per format di `test/fixtures/limits/`.
2. Run `limit_paused` + `limitResetAt` + pemberitahuan berisi jam reset.
3. Penjadwal: reset + 60 dtk; bila jam tak terbaca, coba tiap 30 mnt. Bertahan saat restart (dijadwal ulang di `main.ts`).
4. Saat jalan lagi: batch yang sama diulang (BacklogFlow) atau `--resume` (FreeFlow), di run yang sama.

**G. Sesi desktop (F10)**
1. Plugin Crew Control memasang hook HTTP global ke `/hook/desktop`. Server mati -> hook gagal cepat dan Claude Code berjalan biasa.
2. `session_id` milik Harness (`isOwnSession`, karena Harness memberi `--session-id` sendiri) -> respons `{}` seketika, tidak dicatat (tidak dobel; izin tetap diputus tuan rumah stdio).
3. Selain itu: run `origin: desktop` per `session_id` (judul dari `UserPromptSubmit`, proyek = `cwd` bila di bawah folder kerja, selain itu tetap tampil dengan path asli dan tanpa kendali selain Stop).
4. `PermissionRequest` (termasuk AskUserQuestion) -> pesan `permission`/`question`, koneksi hook ditahan. Jawaban dashboard -> respons hook `decision` (allow/deny + pesan, atau `updatedInput.answers`). Koneksi ditutup Claude Code lebih dulu -> pesan `answered`, `from: desktop`.
5. Stop -> permintaan tertahan dijawab deny, dan respons hook berikutnya dari sesi itu `{ "continue": false, "stopReason": "Dihentikan dari Crew Control" }`. Berlaku pada langkah alat berikutnya (batasan hook).
6. Token dan model dari transkrip (`transcript_path` di payload, divalidasi berada di `~/.claude/projects`).

**H. Pemberitahuan (F6)**
1. Notifier berlangganan `Store.subscribeAll`. Pemicu: pesan `question|permission|milestone|decision` baru `pending`; run -> `ready_review`, `failed`, `disconnected`, `limit_paused`. Batch selesai dan commit bukan pemicu.
2. Kunci dedupe di `notifications`; push `{ title: "Butuh kamu · <proyek>", body: <=120 karakter, url: /proyek/<id>?m=<msg>, tag }` ke semua langganan; timeout 10 dtk; 404/410 -> langganan dihapus.
3. Terjawab -> `resolved_at`; push "selesaikan" dengan tag sama: service worker menutup notifikasi bertag itu (atau menggantinya dengan ringkasan bila masih ada yang menunggu).
4. Laptop (halaman terbuka): polling `GET /api/projects` 3 dtk -> judul tab `(N) Butuh kamu · <proyek>`, bunyi (bisa dimatikan), `Notification` desktop setelah pemilik menekan Aktifkan.

**I. Daftar proyek dan HP (F11)**: satu set rute dan container; layar < 900 px memakai komponen HP dari `ui/` (tanpa peta dan kolom agent). PWA: `manifest.webmanifest` + `sw.js` (push, klik notifikasi membuka URL, halaman offline "Crew Control hanya bisa dibuka lewat Tailscale..."); service worker tidak meng-cache API.

**J. Kesehatan kit dan Riwayat (F9, F12)**: `KitHealth` menghitung dari tabel (token item dari `agent_activity` ber-`item_key`; menunggu dari `messages`; revisi dari `items.origin=perbaikan` + `attempts`; melar dari `items.origin=ditambah` dibanding `initial_item_count`). Basis < 5 tidak ditandai dan tanpa persen. Nilai null = "belum ada data". Riwayat memakai `GET /api/runs` (kursor) dan `GET /api/compare` (peringatan "tidak setara" bila tim atau perintah beda).

---

## 8. Cakupan fitur MVP

| Fitur | Modul utama | Catatan |
|---|---|---|
| F1 Tim sebagai data | TeamCatalog, kontrak 4.1, `agentStates`, `railLayout` | Tim tiruan di `test/fixtures/teams` |
| F2 Run oleh harness | Harness (ada), Conductor, Projects (`createFolder`), limits | Lanjutkan, Jeda > 50 mnt, kapasitas `CREW_MAX_RUNS` |
| F3 Batch dan milestone | Conductor `BacklogFlow`, BacklogPort, Git | Perubahan kit 4.2 |
| F4 Layar proyek tiga kolom | SSE `activity/tool/batch/milestone`, `AgentDetail`, `ui/screens/ProjectView` | Timeline dari `agent_activity` |
| F5 Chat | Harness, Policy + rules, DesktopSessions | Ketik-lanjut hanya run terakhir `done` |
| F6 Pemberitahuan | Notifier, `sw.js`, `useTitleBadge` | |
| F7 Review + galeri | Review routes, Evidence, Mermaid/grafik | |
| F8 Kontrak bukti | Kontrak 4.3, Evidence | Isi kit 4.2 |
| F9 Kesehatan kit | Transcripts, KitHealth | |
| F10 Sesi desktop | DesktopSessions, plugin hook | Uji tangan pemilik |
| F11 HP ringkas | `ui/screens/Mobile*`, PWA, `tailscale serve` | |
| F12 Riwayat | `GET /api/runs`, compare, `DELETE` | |
| F13 Tema dan bahasa | `tokens.css` (terang/gelap), `useSettings` | Bahasa UI: id |

---

## 9. Permukaan keamanan `[SEC]`

- `[SEC]` **Kendali jarak jauh** (semua `POST`): bisa menjalankan agent yang mengubah berkas dan menjalankan perintah di laptop. `src/security.ts`, `server.ts onRequest`.
- `[SEC]` **Harness / Policy**: izin otomatis A3, aturan "Selalu setujui", perintah berisiko. `src/policy.ts`, `src/harness/`.
- `[SEC]` **Path dan folder**: `resolveProject`, `browseFolder`, `createFolder`, folder proyek yang dihapus/diganti sebelum lanjut.
- `[SEC]` **Penyajian berkas bukti** (`/api/evidence/*`): baca berkas dari folder proyek atas permintaan klien.
- `[SEC]` **Hook** (`/hook/:token`, `/hook/desktop`): proses lokal memengaruhi keputusan izin.
- `[SEC]` **Pemanggilan proses** (`claude`, `git`, CLI backlog tim): argv, `shell: false`, cwd = proyek tervalidasi.
- `[SEC]` **Commit otomatis**: bisa ikut menyimpan rahasia ke riwayat git.
- `[SEC]` **Panggilan keluar**: Web Push ke endpoint dari browser (SSRF).
- `[SEC]` **Render teks agent dan bukti** di tampilan (XSS).
- `[SEC]` **Definisi tim**: template dan path CLI dari plugin tim.
- `[SEC]` **Transkrip**: membaca berkas di `~/.claude/projects`.
- `[SEC]` **Rahasia**: kunci privat VAPID; token login Claude tidak pernah disentuh (A1).

---

## 10. Threat model

Sumber kontrol: `security-checklists` (Auth and sessions, Input and DB, File uploads, API, Secrets and config, External calls / SSRF, Deployment). Tanpa pembayaran dan tanpa unggah dari pengguna.

**Aset:** (1) laptop pemilik: berkas di folder kerja dan kemampuan menjalankan perintah; (2) kuota langganan Claude; (3) kode dan riwayat git proyek; (4) isi Chat dan riwayat (bisa memuat potongan kode/rahasia); (5) saluran pemberitahuan (kunci VAPID, langganan push).

**Penyerang yang mungkin:** halaman web jahat yang terbuka di browser pemilik (CSRF, DNS rebinding); perangkat lain di Wi-Fi yang sama; perangkat/anggota lain di tailnet; isi proyek atau web yang dibaca agent (prompt injection) yang membuat agent menulis teks/berkas berbahaya; berkas bukti berbahaya; dependensi npm yang disusupi. Proses lain di laptop yang sama dianggap tepercaya (di luar cakupan).

| Ancaman | Kontrol yang dipilih |
|---|---|
| Orang di jaringan memulai run (eksekusi kode jarak jauh) | Server hanya listen `127.0.0.1` (0.0.0.0 ditolak saat start); HP lewat `tailscale serve` (hanya tailnet, HTTPS); allowlist peer + Host; opsional `CREW_TAILSCALE_USERS` mencocokkan `Tailscale-User-Login`. **Auth model:** tanpa akun (PRD), identitas = jaringan Tailscale pemilik |
| Halaman web jahat mengirim perintah lewat browser pemilik (CSRF, DNS rebinding) | Host allowlist, Origin harus sama dengan Host, `Content-Type: application/json` wajib (memaksa preflight), `Sec-Fetch-Site: cross-site` ditolak, tanpa header CORS. **Session handling:** tidak ada cookie/sesi login, jadi tidak ada token yang bisa dicuri |
| Agent keluar dari folder proyek atau merusak | Policy A3 (path di luar proyek, `..`, drive lain, rumah, hapus massal, push, reset, instal global, unduh-jalankan, perintah sistem -> ditanya); "Selalu setujui" ditolak untuk kategori berisiko dan hanya berlaku per proyek; peringatan folder kerja sebagai proyek |
| Traversal path (folder, bukti, aset mockup) | realpath + `isInside` (ada); bukti hanya path yang tercantum di `bukti.json` dan berada di proyek; aset mockup hanya di folder mockup itu; nama folder baru divalidasi; jenis berkas dari allowlist ekstensi + tanda tangan berkas untuk gambar |
| XSS dari teks agent atau bukti | React escaping, markdown tanpa HTML, tautan tidak bisa diklik, Mermaid strict, SVG lewat `<img>`, mockup di iframe sandbox + CSP `sandbox`; CSP aplikasi: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'` (inline style dibutuhkan kanvas peta dan Mermaid) |
| Hook palsu memengaruhi izin | Hook hanya dari loopback; `/hook/:token` dengan token acak 128 bit per sesi; `/hook/desktop` wajib header `X-Crew-Hook` (memaksa preflight dari browser); hook desktop tidak pernah memutus izin sesi Harness |
| Injeksi perintah lewat argumen (git, CLI backlog, claude) | `spawn` argv, `shell: false`; id item divalidasi `^[a-z0-9][a-z0-9-]{0,63}$`; teks pemilik hanya sebagai satu argumen/isi pesan |
| Rahasia masuk commit otomatis | Sebelum `git add`: tolak bila perubahan memuat `.env*` (kecuali `.env.example`), `*.pem`, `*.key`, `id_rsa*`, `*.pfx`, atau berkas > 50 MB -> run dijeda dengan daftar berkas; `.gitignore` proyek dihormati |
| SSRF lewat endpoint push | Hanya `https:` dengan host di allowlist (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`, `*.push.apple.com`, `web.push.apple.com`); timeout 10 dtk; tanpa ikut redirect |
| Rahasia bocor | Token login Claude tidak dibaca/disimpan/diteruskan, tanpa `--bare` (A1); kunci VAPID di `data/vapid.json` (gitignored), tidak pernah dikirim ke klien (hanya kunci publik); `.env.example` tanpa nilai; log tanpa isi env; galat tanpa stack trace |
| Validasi input | zod `.strict()` di semua batas (ada), panjang dibatasi, badan maks 64 KB, kueri SQL berparameter saja |
| Penyalahgunaan sumber daya | `CREW_MAX_RUNS` (1..3), 1 run aktif per proyek, 60 permintaan pengubah/menit, paginasi daftar, SSE replay maks 5000 event per sambungan |
| Definisi tim jahat | Plugin tim dipasang sendiri oleh pemilik (tepercaya), tetapi template hanya boleh memakai placeholder yang dikenal, `cli[0]` harus `node`, dan path skrip harus di bawah folder rumah `.claude` atau folder plugin |
| Dependensi disusupi | `package-lock.json` dipakai (`npm ci`), versi dipin, `npm audit` sebelum rilis |
| Privasi | Semua data lokal di `data/` (gitignored); hapus run menghapus baris dashboard saja; transkrip dibaca hanya dari `~/.claude/projects` |

---

## 11. Kontrak bersama

**Satu modul: `src/contract/`** (zod; ekspor dari `src/contract/index.ts`). Isinya skema request/response tiap endpoint, event SSE, `TeamManifest`, `EvidenceManifest`, enum status, `MODELS`, `countTokens`, label status `STATUS_LABEL`.
- **be** memvalidasi setiap request dan respons dengan skema ini (`parse` dan `ok` di `server.ts`, sudah ada).
- **fe** mengimpor tipe lewat alias Vite/TS `@contract` -> `src/contract/index.ts` (`import type`, plus skema bila perlu validasi di klien). Tidak ada tipe API yang ditulis ulang di `web/`.
- Teks bagian 6 dan skema harus sama; bila beda, skema menang dan dokumen ini diperbarui di item yang sama.
- Langkah pertama yang mekanis: `src/contract.ts` dipindah ke `src/contract/` (dipecah per area) tanpa mengubah perilaku; 50 tes tetap hijau.

---

## 12. Menjalankan lokal

**Alat:** Windows 11, Node.js >= 22.13 (terpasang 22.17), npm 10, Git >= 2.40, Claude Code CLI >= 2.1.314 (login langganan pemilik), plugin `fullstack-dev` + `ui-designer-kit` + `crew-control` terpasang; Tailscale (hanya untuk HP).

**Env** (`.env`, semua opsional, contoh di `.env.example`, tanpa rahasia): `CREW_PORT`, `CREW_HOST`, `CREW_WORK_ROOT`, `CREW_DB`, `CREW_DEFAULT_MODEL`, `CREW_MAX_RUNS`, `CREW_CLAUDE_BIN`, `CREW_ALLOWED_HOSTS`, `CREW_ALLOWED_ORIGINS`, `CREW_TEAM_DIRS`, `CREW_BATCH_SIZE`, `CREW_TAILSCALE_USERS`, `CREW_VAPID_SUBJECT` (mis. `mailto:` pemilik, wajib oleh Web Push).

**Database:** dibuat dan dimigrasi otomatis saat server mulai (`Store.migrate`, `PRAGMA user_version`). Data contoh berlabel untuk ux/ui/qa: `npm run seed` (menulis ke `data/demo.db`; jalankan server dengan `CREW_DB=data/demo.db`). Kunci VAPID dibuat otomatis di `data/vapid.json` saat pertama jalan.

| Perintah | Isi |
|---|---|
| `npm install` | dependensi |
| `npm run dev` | server `tsx watch src/main.ts` di **4780** + Vite di **5173** (proxy `/api` dan `/hook` ke 4780; `CREW_ALLOWED_ORIGINS=http://localhost:5173`) |
| `npm run build` | `vite build` -> `web/dist` |
| `npm start` | server produksi di **http://127.0.0.1:4780** (melayani `web/dist`) |
| `npm run seed` | data contoh ke `data/demo.db` |
| `npm test` | `node --import tsx --test test/*.test.ts` (claude tiruan; tanpa kuota) |
| `npm run typecheck` | `tsc --noEmit` (server, kontrak, `web/src`) |

Port 4777 tetap milik Flow Viewer; Crew Control 4780.

---

## 13. Deploy

Target: laptop Windows pemilik (bukan hosting; PRD bagian 8 dan `docs/KEPUTUSAN.md`). Tanpa otomasi deploy.
1. `npm ci && npm run build`; isi `.env` (minimal `CREW_WORK_ROOT`, `CREW_VAPID_SUBJECT`; `CREW_HOST` tetap `127.0.0.1`).
2. Jalankan `npm start` (opsional: Task Scheduler "saat logon" agar hidup otomatis); pasang plugin `crew-control` agar hook sesi desktop aktif; matikan hook Flow Viewer.
3. `tailscale serve --bg --https=443 http://127.0.0.1:4780`, isi `CREW_TAILSCALE_USERS` dengan login Tailscale pemilik.
4. Di HP: buka `https://<laptop>.<tailnet>.ts.net`, Tambahkan ke layar utama, tekan Aktifkan pemberitahuan.

---

## 14. Asumsi teknis (diputuskan architect)

- T1. Stream-json `claude` memuat pesan subagent (`parent_tool_use_id`) untuk status agent live; token dan model per agent diambil dari transkrip. Bila stream ternyata tidak memuat langkah subagent, status agent diturunkan dari `tool_use`/`tool_result` Task milik orkestrator (lebih kasar, tetap memenuhi F4).
- T2. `claude --session-id <uuid>` dipakai Harness agar id sesi diketahui sebelum proses jalan (penggabungan hook F10 tanpa celah waktu). Diverifikasi di item pertama Harness; cadangan: abaikan hook desktop yang `cwd`-nya sama dengan run Harness aktif sampai `init` tiba.
- T3. Definisi token tampilan = input + output + cache tulis (UX U2); rumus batas langganan tidak dipublikasikan, jadi tidak bisa dipastikan "paling dekat". Satu fungsi, mudah diganti.
- T4. Item `checkpoint` ditanyakan dashboard, bukan orkestrator (mode `--crew`), sehingga item lain tetap jalan (AC F3). Jawaban diterapkan di antara batch.
- T5. Gambar bukti > 5 MB tidak dikecilkan server (tanpa pustaka gambar); tampil sebagai kartu pratinjau berisi nama dan ukuran + Buka berkas asli.
- T6. Stop sesi desktop berlaku di langkah alat berikutnya (hook tidak bisa mematikan proses desktop).
- T7. Push "selesaikan" setelah dijawab bisa memunculkan notifikasi generik di Chrome bila tidak ada notifikasi tersisa; diterima, diuji di HP pemilik.
