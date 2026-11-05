# Spike dan irisan tipis Crew Control (arsip bukti)

Dipindah apa adanya dari docs/KEPUTUSAN.md pada 2026-11-04 saat arsitektur penuh ditulis. Kontrak API di bawah sudah digantikan docs/ARCHITECTURE.md; bagian ini disimpan sebagai bukti A1/A2 yang dirujuk PRD.

## Spike

### Jawaban Q2 (ringkas)
- **A1 kebijakan login: boleh.** Menjalankan program `claude` asli tanpa layar dengan langganan Anda sendiri, untuk pemakaian Anda sendiri, diizinkan dokumen resmi Anthropic. Dipakai **jalur harness** (dashboard yang menjalankan sesi). F2 dan F3 tetap MVP.
- **A2 bukti teknis: 4 dari 4 kemampuan terbukti** di laptop ini (Claude Code 2.1.314, login langganan Pro). Satu catatan: izin dan jawaban untuk sesi aplikasi desktop dibuktikan lewat simulasi yang memakai mekanisme yang sama dengan aplikasi desktop; perlu satu kali uji tangan 2 menit di aplikasi desktop saat irisan tipis.

### A1. Kebijakan login (sumber resmi, dibaca 2026-11-04)
| Sumber | Isi yang relevan |
|---|---|
| code.claude.com/docs/en/legal-and-compliance (diubah 2026-11-04) | Login langganan (OAuth) "untuk pemakaian biasa Claude Code". Yang dilarang: pengembang **menawarkan login Claude.ai di aplikasi mereka**, **menyalurkan kredensial langganan untuk pengguna lain**, dan **menyimpan atau menjadi perantara token login**. Tidak melarang "pengguna masuk ke program Claude Code asli (tidak diubah) dengan langganannya sendiri". |
| code.claude.com/docs/en/authentication | `claude setup-token` (token langganan 1 tahun) disebut resmi "untuk CI dan skrip". Artinya pemakaian otomatis program `claude` dengan langganan memang didukung. |
| code.claude.com/docs/en/headless | Mode tanpa layar (`claude -p`) didokumentasikan untuk skrip; yang wajib API key hanya mode `--bare`. |
| anthropic.com/legal/consumer-terms (berlaku 8 Okt 2025) | Akses otomatis dilarang "kecuali lewat API key **atau di tempat yang kami izinkan secara eksplisit**". Dua dokumen di atas adalah izin eksplisit itu untuk program `claude`. |

Syarat yang dikunci di desain: dashboard **menjalankan program `claude` asli**, bukan paket Agent SDK (kerangka pembuat agent; dokumen meminta API key untuk produk berbasis SDK); dashboard **tidak membaca, menyimpan, atau meneruskan token login**; tidak dipakai orang lain; tidak memakai `--bare`. Risiko sisa: Anthropic berhak mengubah aturan. Jalur cadangan (kendali lewat hook) tetap ada karena dibangun juga untuk F10, jadi beralih murah.

### A2. Bukti teknis (kode: `spike/probe.mjs`, log lengkap: `spike/hasil/*.jsonl`)
Cara kerja: dashboard menyalakan `claude -p` dan berbicara lewat jalur masuk-keluar program (stream-json), menjadi "tuan rumah izin" (`--permission-prompt-tool stdio`, peran yang sama dengan aplikasi desktop). Hook HTTP (pemberitahuan dari Claude Code ke server lokal) dipakai untuk jeda dan sesi desktop.

| Kemampuan | Hasil | Bukti (perintah `node spike/probe.mjs <skenario>`, potongan keluaran) | Dampak ke PRD |
|---|---|---|---|
| Menjawab pertanyaan berpilihan | Terbukti | `tanya`: `5.1s PERTANYAAN: Warna favorit? \| pilihan: Merah / Biru` lalu `7.2s JAWAB: Biru` lalu `tool_result ... "Warna favorit?"="Biru"`; file `jawaban.txt` berisi `Biru` | F5 sesuai. Jawaban bebas dan multi-pilih memakai format yang sama |
| Izin Setujui / Tolak dengan alasan | Terbukti | `izin`: file 1 `-> SETUJUI` dibuat; file 2 `-> TOLAK dengan alasan`, agent menjawab "Tool Write menolak dengan pesan: Ditolak pemilik: jangan membuat file kedua... Saya tidak mencoba ulang" | F5 sesuai. Mode izin A3 bisa diterapkan dashboard sendiri (otomatis di dalam folder proyek, tanya di luar) |
| Pesan ke sesi yang berjalan | Terbukti | `pesan`: pesan dikirim di detik 5.6 saat perintah 15 detik jalan; setelah perintah selesai (19.3s) agent langsung membuat `nanas.txt` di giliran yang sama | F5 sesuai. Pesan masuk setelah langkah alat yang sedang jalan selesai |
| Jeda di batas langkah, lanjut di sesi sama | Terbukti | `jeda`: `3.5s PEMILIK TEKAN JEDA` lalu `5.6s JEDA: menahan Write` ... `23.5s LANJUT: Write ditahan 17.9s`; a, b, c dibuat berurutan, satu sesi | F2 sesuai. Jeda lebih dari ~50 menit: dashboard menghentikan giliran lalu melanjutkan sesi yang sama (`--resume`, terbukti: sesi `ac1cec06` ingat perintah sebelumnya) |
| Stop | Terbukti | `stop`: `PEMILIK TEKAN STOP` lalu `proses berhenti total 2.1s setelah Stop`; perintah `ping` yang sedang jalan ikut berhenti | F2 sesuai (batas 10 detik) |
| Izin sesi desktop lewat hook | Terbukti (simulasi) | `hook-izin`: tuan rumah sengaja diam, hook menjawab Setujui setelah 3 detik, Claude Code membatalkan dialog tuan rumah (`control_cancel_request`) dan file dibuat. `tanya-desktop`: pertanyaan berpilihan dijawab lewat hook dengan cara yang sama | F10 sesuai. Dokumen hooks: aplikasi desktop memakai peran tuan rumah yang sama dan "siapa yang memutuskan duluan, itu yang dipakai". Perlu uji tangan 1x di aplikasi desktop |

Temuan tambahan:
- Plugin terpasang (termasuk `fullstack-dev`) aktif di sesi tanpa layar; perintah `/fullstack-dev:*` tersedia. Login terbaca sebagai langganan (`apiKeySource: none`).
- Hook Flow Viewer lama juga ikut menyala di sesi dashboard. Saat Crew Control dipakai, Flow Viewer dimatikan atau event digabung per sesi (sudah diminta F10).
- Pertanyaan hanya bisa dari sesi utama (A8 benar).
- Biaya spike: 8 sesi model kecil, setara ~0,06 USD, terpotong dari kuota langganan.

### Port
Server Crew Control: **4780** (4777 tetap milik Flow Viewer). Spike memakai 4781 sementara.

### Rekomendasi stack untuk irisan tipis
| Bagian | Pilihan | Alasan satu baris |
|---|---|---|
| Server | Node.js 22 + TypeScript + Fastify | Node sudah terpasang dan spike sudah jalan di Node; Fastify ringan dan cepat |
| Kendali sesi | Menjalankan `claude` langsung (stream-json + tuan rumah izin + hook HTTP), satu modul "Harness" | Terbukti di spike; tanpa paket Agent SDK (syarat A1) |
| Penyimpanan | SQLite bawaan Node (`node:sqlite`) di satu modul penyimpanan | Tanpa instalasi tambahan di Windows; bisa diganti tanpa menyentuh bagian lain |
| Tampilan | React + Vite; pembaruan live lewat SSE (aliran data satu arah dari server ke browser) | Grafik ala n8n nanti butuh React Flow; SSE lancar lewat Tailscale |
| Kontrak data | Skema zod bersama server dan tampilan | Satu sumber kebenaran untuk bentuk data |

Irisan tipis yang disarankan: Run baru (prompt bebas) -> daftar event live -> Chat (jawab pertanyaan, Setujui/Tolak, ketik pesan) -> Jeda/Lanjut/Stop, satu proyek, tanpa batch dan tanpa desain.

## Irisan tipis (server), dibangun 2026-11-04

Kode: `src/` (server), tes: `test/`. Kontrak data yang berlaku: `src/contract.ts` (zod; bila beda dengan teks ini, kode menang, lalu perbarui teks ini).

### Menjalankan
```
cd plugins/crew-control
npm install
npm start          # http://127.0.0.1:4780 ; pengaturan lewat env, lihat .env.example
npm test           # 49 tes (A3, folder kerja, Harness vs claude tiruan, HTTP + SSE)
npm run typecheck
```
Env penting: `CREW_WORK_ROOT` (default `D:\01_Workspace`; akar tetap: run boleh di akar itu sendiri atau folder di kedalaman berapa pun di bawahnya), `CREW_DEFAULT_MODEL` (opus, sonnet atau haiku; default sonnet), `CREW_HOST` (default 127.0.0.1; untuk Tailscale isi IP Tailscale, bukan 0.0.0.0), `CREW_MAX_RUNS` (default 1), `CREW_ALLOWED_ORIGINS` (mis. `http://localhost:5173` bila fe memakai proxy dev Vite), `CREW_ALLOWED_HOSTS`. Data di `data/crew.db` (tidak masuk git).

### Tampilan polos (web/), dibangun 2026-11-04
Server melayani `web/` sendiri di port yang sama: buka `http://127.0.0.1:4780`. Tanpa Vite/React/build: HTML + JS modul biasa (`web/index.html`, `app.js`, `lib.js`; logika murni di `lib.js` dites di `test/web.test.ts`). Tanpa gaya, hanya markup semantik; teks agent dipasang lewat `textContent`. Hanya berkas satu tingkat di `web/` yang dilayani. Ini bahan untuk ux dan ui-designer; migrasi ke React bila ui-direction memutuskan perlu.

### Aturan umum API
- Semua `POST` wajib header `Content-Type: application/json`. Tanpa isi: kirim `{}` (badan ekstra ditolak 400).
- Hanya dari localhost atau Tailscale (peer 127.x, ::1, 100.64.0.0/10, fd7a:115c:a1e0::/48); header `Host` harus localhost, 127.0.0.1, ::1, `*.ts.net` atau IP Tailscale; `Origin` (bila ada) harus sama dengan `Host` atau ada di `CREW_ALLOWED_ORIGINS`. Selain itu 403.
- Galat selalu `{ "error": { "code": "...", "message": "bahasa Indonesia", "details"?: {...} } }`. Kode: `invalid_request` 400 (`details.issues`), `invalid_project`/`project_not_found`/`project_outside_root` 400, `not_found` 404, `project_busy` 409 (`details.activeRunId`), `capacity` 409, `run_not_active` 409, `already_answered` 409 (`details.state`, `details.answeredFrom`), `wrong_kind` 400, `invalid_answer` 400, `forbidden_*` 403, `unsupported_media_type` 415, `internal_error` 500.
- **Teks agent** (`text`, `question`, `label`, `description`, `tool.summary`, `reason`, `lastLog`) adalah teks biasa; server tidak mengubahnya. Tampilan wajib merender sebagai teks (`textContent`), bukan HTML atau markdown mentah.
- Waktu: ISO 8601 UTC.

### Endpoint
| Metode dan path | Isi | Hasil |
|---|---|---|
| `GET /api/config` | | `{ workRoot, projects: [{name, path}] (pintasan: subfolder langsung), models: [{id, label, description}], defaultModel, maxRuns, permissionMode: "A3" }` |
| `GET /api/folders?path=<abs>` | `path` kosong = `workRoot` | `{ path, name, parent \| null, isRoot, folders: [{name, path}] }`: subfolder langsung (urut nama, maks 500; tanpa `.x`, `node_modules`, dan symlink/junction yang keluar akar). `parent` null di akar. Path di luar akar: 400 `project_outside_root`. Dipakai untuk menjelajah bertahap; path yang dikembalikan boleh langsung jadi `project` |
| `POST /api/runs` | `{ project: <path absolut: workRoot atau folder di bawahnya, kedalaman bebas>, prompt: string 1..20000, model?: "opus"\|"sonnet"\|"haiku" (kosong = defaultModel; selain daftar: 400) }` | 201 `Run`. Mode izin A3 otomatis. Satu run aktif per proyek (409 `project_busy` + `activeRunId`) |
| `GET /api/runs?project=<path>` | | `{ runs: Run[] }` terbaru dulu |
| `GET /api/runs/:id` | | `{ run: Run, messages: Message[] }` (keadaan lengkap, untuk muat awal) |
| `GET /api/runs/:id/events` | `?after=<seq>` atau header `Last-Event-ID` | SSE, lihat bawah |
| `POST /api/runs/:id/messages` | `{ text: 1..8000 }` | 201 `Message` kind `owner`. Saat Jeda: `state: "queued"`, dikirim saat Lanjut (`sentOnResume: true`). **Chat berkelanjutan**: bila run sudah berakhir (`done`/`failed`/`stopped`/`disconnected`) dan punya `sessionId`, pesan melanjutkan sesi yang sama (`claude --resume`): run yang sama kembali `running`, `endedAt` null, 201 `Message` kind `owner` state `sent`. Proyek dipakai run lain: 409 `project_busy`; penuh: 409 `capacity`; folder sudah tidak sah: 400 `project_outside_root`/`project_not_found`; run tanpa sesi (gagal sebelum mulai) atau sedang dihentikan: 409 `run_not_active` |
| `POST /api/runs/:id/messages/:mid/answer` | pertanyaan: `{ kind: "question", answers: { "<teks pertanyaan persis>": "jawaban" \| ["a","b"] } }` (semua pertanyaan harus dijawab; pilihan atau teks bebas; multi-pilih = array). Izin: `{ kind: "permission", decision: "allow" \| "deny", reason?: string }` | 200 `Message` (state `answered`). Jawaban pertama menang; berikutnya 409 `already_answered` |
| `POST /api/runs/:id/pause` / `resume` / `stop` | `{}` | 200 `Run`. Stop idempoten; Jeda menahan langkah alat berikutnya (bukan memutus yang sedang jalan) |

`Run`: `id, project, projectName, prompt, model, origin("dashboard"), status, reason, lastLog, sessionId, pending (jumlah menunggu pemilik), tokens {input,output,cacheRead,cacheWrite}|null (terisi saat giliran selesai), startedAt, endedAt, durationMs`.
`status`: `running` (Jalan), `needs_owner` (Butuh kamu), `paused` (Dijeda), `done` (Selesai), `failed` (Gagal; lihat `reason` + `lastLog`), `stopped` (Dihentikan), `disconnected` (Terputus: server berhenti saat run jalan). `limit_paused` dan `ready_review` ada di enum tetapi belum dipakai.
`Message`: `id, runId, kind (agent|question|permission|owner|system), text, createdAt, state, questions, tool, answer, answeredAt, sentOnResume`. `question`: `state` pending -> answered | cancelled, `questions: [{question, header, multiSelect, options:[{label, description}]}]`. `permission`: `tool: {name, summary, why}` (`why` = alasan ditanya, mis. "Path di luar folder proyek: ..."), jawaban `answer.decision/reason`. `cancelled` + `answer.from`: `agent` (claude membatalkan, mis. dijawab di tempat lain) atau `system` (run berakhir/dihentikan). `system`: Run selesai/dihentikan/gagal/terputus.

SSE: setiap event `id: <seq naik>`, `event: run | message | tool`, `data: <JSON>`. `run` = `Run` penuh terbaru; `message` = `Message` penuh (baru atau diperbarui: ganti per `id`); `tool` = `{ name, summary, subagent, at }` (satu langkah alat; untuk daftar aktivitas). Tanpa `after`, server memutar ulang semua event dari awal, lalu lanjut live; jadi cukup membuka `EventSource` tanpa `GET /api/runs/:id` terlebih dahulu. Ping komentar tiap 15 detik. Tidak ada aliran global antar-run; daftar proyek memakai polling `GET /api/runs`.

Mode izin A3 yang dijalankan server: Write/Edit/Read/Glob/Grep di dalam folder proyek dan perintah shell tanpa pola berisiko otomatis disetujui. Ditanyakan di Chat: path di luar folder proyek, `..`, path drive lain atau folder rumah, hapus massal, `git push`/`reset --hard`/`clean`, instal global, unduh-lalu-jalankan, perintah sistem, dan alat yang belum punya aturan (termasuk semua `mcp__*`).

### Bukti (2026-11-04, laptop ini, Claude Code asli, model haiku)
- `npm test`: 38 lulus, 0 gagal. Mutasi (mematikan penahan Jeda) membuat tes Jeda merah.
- Run sungguhan lewat server di port 4780 (folder kerja sementara): pertanyaan berpilihan dijawab via API lalu agent menulis `jawaban.txt` = `Biru`; Jeda 10 detik menahan `b.txt` dan `c.txt` (hanya `a.txt` ada), Lanjut menyelesaikan ketiganya di sesi yang sama; Stop pada `ping -n 60` berhenti dalam ~3 detik, status `stopped`, tidak ada proses ping tersisa.

### Masalah terbuka dan batas irisan ini
- Belum ada: batch/milestone, tim sebagai data, Kesehatan kit, "Selalu setujui", "Lanjutkan" run Gagal/Terputus (buka sesi baru), jeda limit pemakaian, sesi desktop (hook PermissionRequest, uji tangan masih menunggu), push HP, folder proyek baru, menyajikan berkas UI (fe memilih: proxy dev Vite + `CREW_ALLOWED_ORIGINS`, atau server menyajikan `web/dist`).
- Satu giliran selesai = run `done` (proses ditutup setelah 2 detik); pesan berikutnya memulai proses baru dengan `--resume` pada run yang sama (jeda mulai beberapa detik, konteks sesi utuh). Tidak ada status "menunggu pesan"; UI memperlakukan `done` sebagai "siap dilanjutkan". `startedAt` tetap dari awal sehingga `durationMs` memuat waktu diam.
- Akar folder kerja boleh jadi proyek: izin otomatis A3 lalu berlaku untuk seluruh isi akar. Pemilik menetapkan akar lewat env.
- Jeda lebih dari ~50 menit belum ditangani (hook timeout 3600 dtk; rencana spike: hentikan giliran lalu `--resume`).
- Aturan izin memakai pola teks, bukan parser shell; symlink di dalam proyek yang menunjuk keluar tidak diselesaikan. Cukup untuk laptop sendiri, perlu diperkuat bila ada risiko lain. Semua alat `mcp__*` (mis. Playwright) akan ditanya sampai ada "Selalu setujui".
- Batas run bersamaan default 1 (rekomendasi KEPUTUSAN, menunggu jawaban pemilik); `CREW_MAX_RUNS` maks 3.
- Hook Flow Viewer lama ikut menyala di sesi dashboard selama Flow Viewer hidup (catatan spike).
- `node:sqlite` masih berlabel eksperimental di Node 22 (peringatan di log); tidak ada seed karena belum ada data contoh yang bermakna di irisan ini.

## Cek T1/T2 (2026-11-05, item f12-spike-asumsi)

Perintah (folder kerja kosong sementara, Claude Code 2.1.314, langganan):
`claude -p "<suruh Task/Agent sekali menjalankan echo hai>" --model haiku --session-id <uuid baru> --output-format stream-json --verbose --allowedTools "Task,Agent,Bash(echo:*)" --max-turns 6`
Keluaran nyata (34 baris; path rumah disamarkan, tanda tangan thinking dan daftar panjang di `init` dipotong): `test/fixtures/stream/subagent-background-haiku.jsonl`. Biaya ~0,025 USD (2 giliran haiku).

### T1. Langkah subagent di stream-json: **terbukti**
- Pesan `assistant` dan `user` milik subagent membawa `parent_tool_use_id` = `id` tool_use pemanggilnya (baris 18, 23, 24: `tool_use Bash`, `tool_result "hai"`, teks akhir). Pesan orkestrator membawa `parent_tool_use_id: null`. `message.model` ada di pesan subagent, jadi model per agent bisa dibaca dari stream juga.
- Ada event status yang lebih rapi dari menebak: `system task_started` (`tool_use_id`, `task_id`, `subagent_type`, `description`, `is_backgrounded`, `spawn_depth`), `task_progress` (`last_tool_name`, `usage.total_tokens`, `tool_uses`), `task_updated` (`patch.status: completed`), `task_notification` (`status`, `summary`, `usage`), `background_tasks_changed` (`tasks` yang masih jalan).
- Temuan yang mengubah rencana Harness:
  1. Nama alat sekarang **`Agent`**, bukan `Task`. Parser wajib menerima keduanya.
  2. Subagent jalan **di latar** secara bawaan (`is_backgrounded: true`): `tool_result` Agent kembali seketika berisi "Async agent launched successfully", jadi `tool_result` **bukan** tanda subagent selesai. Selesai = `task_notification` / `task_updated` berstatus `completed` (atau gagal) dengan `tool_use_id` yang sama.
  3. Satu proses bisa mengeluarkan **lebih dari satu `result`**: orkestrator menutup giliran 1 (`result` baris 29) sebelum subagent selesai, lalu notifikasi tugas memicu giliran 2 di proses yang sama (`init` kedua baris 30, `result` kedua baris 33). Aturan FreeFlow "giliran selesai -> 2 dtk tanpa pesan -> tutup" harus ditambah: **jangan tutup selama `background_tasks_changed.tasks` terakhir tidak kosong**; tunggu `result` berikutnya.
  4. Pesan orkestrator dan subagent berselang-seling (baris 21-24); status per agent dikunci per `parent_tool_use_id`, bukan urutan.
- Aturan cadangan (bila suatu versi tidak lagi mengirim `parent_tool_use_id`): agent `berjalan` saat `task_started` (atau `tool_use` bernama `Agent`/`Task`); `selesai`/`gagal` dari `task_notification.status`; bila event `task_*` juga tidak ada, dari `tool_result` Agent/Task yang bukan teks "Async agent launched" (`is_error` = gagal). Langkah alat di dalam subagent lalu tidak terlihat; hanya ringkasan `last_tool_name` dari `task_progress` bila ada.

### T2. `--session-id <uuid>`: **diterima**
- `init.session_id` = uuid yang diberikan (`b3095d73-...`), begitu juga semua event lain termasuk `hook_started` yang keluar **sebelum** `init`, dan kedua `result`. Jadi Harness tahu id sesi sebelum proses jalan dan hook F10 bisa dicocokkan tanpa celah waktu. Cadangan (abaikan hook desktop yang `cwd`-nya sama dengan run Harness aktif sampai `init` tiba) tidak diperlukan, tetap dicatat bila suatu versi menolak flag ini.

### Belum dicek (sengaja, hemat kuota)
- Subagent latar depan (`run_in_background: false`) dan subagent bersarang (`spawn_depth` > 1): diduga sama (`parent_tool_use_id` + `task_*`), belum ada fixture.
- `--session-id` dengan uuid yang sudah pernah dipakai: Harness wajib membuat uuid baru per `launch`; lanjut sesi tetap lewat `--resume`.
