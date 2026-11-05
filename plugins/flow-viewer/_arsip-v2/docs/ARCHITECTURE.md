# ARCHITECTURE: Flow Viewer v2

Sumber: `docs/PRD.md` (Locked v1.2; definisi mengikat di PRD 4a. Diselaraskan 2026-11-03: §4.1, §4.2, §5.1, §5.3, §6, §7.2, §7.3, §7.5, §8.1; UX v1.2 2026-11-04: §10.2a), `docs/UX.md`, `docs/DESIGN.md` (Approved), kode 1.7.1 (`server/*`, `hooks/*`), skrip uji lama di scratchpad sesi `b840ce3e` (feed.js, shots.js, mob.js, run.js, r2run.js, replay.js), dan 3.428 event nyata di `~/.claude/flow-viewer/events.jsonl` (dipakai untuk memeriksa asumsi; lihat bagian 9).
Kosakata desain kode: module, interface, seam, adapter, depth (skill `codebase-design`). Istilah domain: `GLOSSARY.md`.

## 1. Stack

| Bagian | Pilihan | Alasan satu baris |
|---|---|---|
| Runtime | Node 22.5+ (terpasang 22.17), modul bawaan saja | PRD §8: tanpa dependensi baru; plugin dimuat langsung dari folder |
| Server | `node:http` satu proses, port 4777, bind `127.0.0.1` | Sudah jalan di 1.7.1; cukup untuk 3 proyek dan beberapa tab |
| Siaran live | Server-Sent Events (`/stream`) | Satu arah, auto-reconnect bawaan browser, sudah dipakai |
| Penyimpanan riwayat | `node:sqlite` (`history.db`), cadangan JSON per run | Sudah ada di `store.js`; skema tetap, tanpa migrasi |
| Frontend | HTML + CSS + ES module vanilla, tanpa bundler | PRD §8; modul ES didukung browser desktop modern, tanpa langkah build |
| Huruf | Newsreader + Hanken Grotesk woff2 lokal | DESIGN §2: tertanam, tanpa jaringan |
| Uji | `node --test` (bawaan) untuk server; Playwright dari instalasi luar plugin untuk UI | Nol dependensi di plugin; Playwright sudah dipakai QA |

## 2. Struktur folder

```
plugins/flow-viewer/
  .claude-plugin/plugin.json      versi 2.0.0 saat rilis
  .gitignore                      baru: *.db, *.db-*, events*.jsonl, history/, server.log, test/.tmp/
  GLOSSARY.md                     istilah domain (tanpa detail teknis)
  commands/flow.md                tetap
  hooks/hooks.json                tetap (tambahan event hanya setelah T12, lihat 7.3)
  hooks/scripts/send.js           tetap
  hooks/scripts/start-server.js   memakai server/build-id.js (bukan daftar file sendiri)
  server/
    server.js        HTTP: guard, routing, SSE, file statis. Tipis.
    guard.js         [SEC] validasi Host/Origin, parameter p/id, path statis. Fungsi murni.
    projects.js      registry proyek: event -> proyek, ikatan sesi, aktif 6 jam, slug, eviksi
    run.js           pelacak satu run: state, detail per agent, percakapan, pending, fase, ringkasan, laporan
    attention.js     fungsi murni: (snapshot, backlog) -> item pemberitahuan
    agents.js        katalog agent: frontmatter + flows.json -> definisi, crew, posisi
    usage.js         [SEC] pembaca transkrip inkremental: token, model, bukti skill
    backlog.js       [SEC] baca docs/backlog.json proyek: progres berbobot, item keputusan
    store.js         riwayat (ditambah previous(), projects(), prune per proyek)
    build-id.js      hash mtime semua file server/ dan public/ (dipakai /health dan start-server)
    flows.json       ditambah bagian "agents": label, peran, ikon (dipindah dari index.html)
    public/
      index.html     kerangka markup dengan semua id (tabel 6), tanpa skrip inline
      boot.js        tema awal sebelum render (pengganti skrip inline 1.7.1)
      css/fonts.css  css/tokens.css  css/app.css
      fonts/hanken-grotesk-latin-wght-normal.woff2  fonts/newsreader-latin-wght-normal.woff2
      js/app.js          entri: rute (?p, v=riwayat), merangkai modul
      js/api.js          fetch + SSE (sambung ulang, bilah terputus); menambah p otomatis
      js/dom.js          [SEC] tag `html` yang meng-escape semua sisipan; `raw()` hanya untuk ikon
      js/format.js       angka token, "N mnt N dtk", jam
      js/icons.js        set ikon status dan peran (nama ikon dari flows.json)
      js/graph.js        tata letak, node penuh/ringkas, konektor, zoom/pan/pas layar, pembaruan berkunci
      js/indicators.js   pita tiga indikator (#strip, #now, #verdict)
      js/alerts.js       kotak pemberitahuan
      js/notify.js       judul tab, bunyi, notifikasi desktop, dedupe per kunci
      js/panel.js        panel samping + rel + lencana + lebar
      js/tabs/chat.js backlog.js files.js skill.js token.js log.js
      js/tabs/agent.js   detail agent satu kolom: kepala, peringatan, jawaban, tiga angka, bagian berlipat (10.2a)
      js/summary.js      lapisan Ringkasan run
      js/history.js      Riwayat, banding, run lama
      js/projects.js     Daftar proyek dan pengalih proyek
      js/theme.js        tema, menu Lainnya, reset
  test/
    unit/*.test.js     node --test, nol dependensi
    http/*.test.js     server di port acak + FLOW_VIEWER_DIR sementara
    fixtures/feed.js   pengirim event skenario (port dari feed.js lama, ditambah cwd/sesi)
    fixtures/events/   potongan event nyata yang sudah disamarkan
    replay.js          putar ulang events.jsonl ke server uji
    ui/*.mjs           Playwright (dijalankan QA dengan Playwright terpasang di luar plugin)
    perf.mjs           beban 3 proyek x 12 agent
```

Data runtime tetap di `~/.claude/flow-viewer/` (`FLOW_VIEWER_DIR` untuk uji): `history.db`, `events.jsonl` (dirotasi 20 MB, simpan 1 cadangan), `server.log`. Folder ini di luar repo mana pun; `.gitignore` plugin menjaga kalau `FLOW_VIEWER_DIR` diarahkan ke dalam repo.

## 3. Module dan seam

Prinsip: `server.js` hanya meneruskan; perilaku ada di module yang dalam dan bisa diuji lewat interface-nya sendiri. Seam nyata (dua adapter) hanya di penyimpanan (SQLite, JSON) dan jam (`now()` diinjeksi untuk uji 6 jam dan debounce).

| Module | Interface (yang harus diketahui pemanggil) | Yang disembunyikan |
|---|---|---|
| `projects.js` | `createRegistry({store, catalog, now})` -> `ingest(ev)` (kembalikan proyek yang berubah atau null), `resolve(p)`, `latest()`, `list()`, `all()`, `inactive()`, `reset(key)`, `isActive(p)`, `idFor(key)`, `sweep()` | normalisasi kunci, ikatan sesi, cwd di subfolder, slug kembar, run baru per sesi/prompt, eviksi |
| `run.js` | `createRun({key, flow, catalog, usage, now, prev})` -> `apply(ev)`, `applyForeign(ev)`, `snapshot()`, `detail(id)`, `report()`, `phase`, `id` | seluruh mesin status 1.7.1 (`handle`, `start/stop`, detail, convo), daftar pending, aturan fase, ringkasan |
| `attention.js` | `attentionOf(snapshot, backlog)` -> `Item[]` | aturan pemicu dan kapan hilang; kunci stabil |
| `agents.js` | `catalogFor(key)` -> `{defs, crew, crewMeta, edges, flow(name)}`; `refresh(key)` | sumber folder, parsing frontmatter (inline dan daftar YAML), cache mtime, penempatan agent baru |
| `usage.js` | `readUsage(paths, {filter, skillNames})` -> `Usage|null` | offset per file, potongan baris, dedupe id pesan, batas path |
| `backlog.js` | `summarize(key)` -> `Backlog|null` | cache mtime, bobot, status turunan (siap/menunggu), batas ukuran |
| `store.js` | `save(r)`, `list(project, limit)`, `get(id)`, `remove(id)`, `previous(project, flow, beforeId, withAgents)`, `projects()`, `kind` | SQLite vs JSON, prune |
| `guard.js` | `checkRequest(req, port)` -> `null` atau `{status, code}`; `parseP(s)`, `parseNodeId(s)`, `staticPath(urlPath)` | aturan Host/Origin/Sec-Fetch-Site, regex, decode + resolve |
| `js/dom.js` | `` html`...` `` (escape otomatis), `raw(s)`, `patch(el, str)` (tulis hanya bila berubah) | aturan escape satu tempat |
| `js/graph.js` | `createGraph(stage, {onSelect})` -> `update(snapshot)`, `select(id)`, `fit()` | layout, mode penuh/ringkas, konektor, zoom, keyed update |
| `js/notify.js` | `createNotifier({project, storage, audio, Notification})` -> `sync(items, visible)` | judul berkedip, bunyi, desktop, dedupe, "sudah dilihat" |

## 4. Model data

### 4.1 Entitas (memori server, kecuali Run tersimpan)

| Entitas | Field penting | Relasi | Aturan kunci |
|---|---|---|---|
| Project | `key` (path folder normal), `id` (slug untuk `?p=`), `name` (nama folder), `shortPath` (2 segmen terakhir), `lastEventAt`, `sessionId` (sesi saat ini), `run` | punya 1 Run aktif, banyak Run tersimpan | Aktif bila `now - lastEventAt < 6 jam`. Maks 20 proyek di memori; yang tidak aktif dan tanpa penonton dibuang (run disimpan dulu) |
| Session binding | `session_id -> project key` | banyak sesi ke satu proyek | Diikat pada event pertama sesi itu; event berikutnya mengikuti ikatan, bukan `cwd` |
| Run | `runId` (ms epoch, monoton global), `flow`, `prompt`, `startedAt`, `updatedAt`, `phase` (idle, running, paused, finished), `finishedResult` (ok, skipped, failed), `nodes`, `main`, `log`, `convo`, `pending[]`, `summary` | milik 1 Project | Tersimpan ke `runs` (SQLite) tiap 3 dtk saat berubah, dan langsung saat fase berubah, run diganti, atau proses keluar |
| Node (agent di run) | field 1.7.1 (`status`, `count`, `segments`, `ms`, `last`, `recent`, `usage`, `files`, `skills`, `background`, `offscope`, `extra`, `modelCheck`) + `label`, `icon`, `failReason`, `lastEventAt`, `quiet` (Agent diam, 5.3) | milik 1 Run, merujuk 1 AgentDef | `status` salah satu: idle, running, done, skipped, optional, input, failed |
| AgentDef | `name`, `label`, `role`, `icon`, `model`, `effort`, `tools`, `skills[]`, `description`, `source` | dari katalog proyek | Nama sama: `<cwd>/.claude/agents` menang atas `~/.claude/agents` menang atas plugin |
| Pending | `key`, `kind` (question, permission, waiting), `sender` (`session:agent_id` atau `session:main`), `text`, `options`, `at` | milik 1 Run | Hilang saat event berikutnya (bukan `Notification`) dari `sender` yang sama tiba. Hanya dibuat oleh tiga sinyal di 5.3, bukan oleh teks berakhir `?` |
| Attention item | `key` (identitas pemicu PRD 4a, bentuk di 5.3), `kind` (question, permission, decision, failed, done), `agent`, `text`, `options[]`, `at` | dihitung dari snapshot + backlog | Tidak disimpan di server; kunci stabil lintas siaran, muat ulang, dan tab |
| Backlog (ringkasan) | `pct`, `done`, `total`, `fase[]`, `items[]`, `parked[]`, `decisions[]` | dibaca dari `<key>/docs/backlog.json` | Cache per mtime; file > 2 MB tidak dibaca |
| Pengaturan tampilan | `fv-theme`, `fv-zoom`, `fv-side-w`, `fv-side-c`, `fv-view`, `fv-tab`, `fv-dsec` (bagian detail yang terbuka, pengganti `fv-dtab`, 10.2a), `fv-sound`, `fv-notif-offered`, `fv-seen:<p>` (kunci pemberitahuan yang sudah dibunyikan/dinotifikasi, bersama untuk semua tab, 7.3); `sessionStorage` `fv-sum:<runId>` | per browser | Kunci 1.7.1 dipertahankan; `fv-view` lama (token/backlog/skill/log) dipetakan ke tab panel |

### 4.2 Skema SQLite (tetap)

Tabel `runs` 1.7.1 tidak berubah: `id` PK, `project` (= kunci proyek), `flow`, `title`, `prompt`, `started_at`, `updated_at`, `finished`, `tokens_eq`, `tokens_raw`, `agents_ran`, `files`, `state` (JSON snapshot, termasuk `summary`), `convo` (JSON). Tambahan: indeks `runs_project_flow (project, flow, started_at DESC)`. Prune: saat `save`, simpan 200 run terbaru **per proyek** (`DELETE ... WHERE project = ? AND id NOT IN (200 terbaru proyek itu)`); tidak ada batas total, karena batas total akan menghapus run proyek lain (PRD F8 AC prune). Run live tidak pernah ikut terhapus. Baris lama tetap terbaca; field baru yang tidak ada di baris lama ditampilkan "Tidak disimpan di Riwayat." (UX U6).

### 4.3 Kunci dan alamat proyek

1. `key = path.resolve(cwd)`; di Windows huruf drive dibuat besar dan pemisah akhir dibuang. Huruf lain tidak diubah agar cocok dengan kolom `project` baris lama.
2. Ikatan: event dengan `session_id` yang sudah terikat masuk ke proyek ikatannya, walau `cwd` berubah. Bukti: 281 event nyata punya `cwd` di `flow-viewer\docs\mockups` dan `\docs` karena Claude pindah folder dalam sesi yang sama.
3. Sesi belum terikat: bila `cwd` berada di dalam kunci proyek yang sudah dikenal (aktif atau ada di riwayat), ikat ke proyek itu; selain itu `cwd` menjadi kunci proyek baru.
4. Event tanpa `cwd` dan tanpa ikatan: masuk ke proyek terbaru aktif; bila belum ada proyek, proyek `(tanpa folder)`.
5. `id` = slug nama folder (`a-z0-9._-`, maks 48). Bila dua kunci berbeda punya slug sama, keduanya memakai `slug-<6 hex sha1(key)>`; bentuk ber-hash selalu diterima, bentuk pendek diterima selama unik. `resolve(p)` juga mencari di `store.projects()` agar proyek lama bisa dibuka lewat Riwayat.
6. `?p=` divalidasi `^[a-z0-9][a-z0-9._-]{0,63}$` dan hanya dipakai sebagai kunci peta. Server tidak pernah membentuk path file dari parameter URL.

## 5. Aturan run, progres, token, pemberitahuan

### 5.1 Batas run dan fase

- `running`: sesi utama berjalan atau ada node `running`, atau event Stop terakhir punya `background_tasks` berstatus running.
- Kandidat akhir: Stop sesi utama, tidak ada node running, `background_tasks` kosong. Diklasifikasikan setelah **2 dtk tanpa event** (hook bisa tiba tak berurutan):
  1. Ada kegagalan yang belum diulang -> `finished`, hasil `failed`.
  2. Flow punya langkah wajib yang belum jalan, **atau** pesan terakhir berakhir dengan `?` -> `paused` (= **Jeda** di layar, PRD 4a). Tidak membuat pending dan tidak membuat item pemberitahuan (PRD F5, A12); pesan terakhir tampil sebagai keterangan Jeda di indikator (a). Tidak menandai Dilewati, tidak membuat Ringkasan run.
  3. Selain itu -> `finished`, hasil `ok` atau `skipped` (langkah wajib dilewati ditandai saat ini, seperti `maybeFinalize` 1.7.1).
- Prompt pemilik baru: bila fase `finished` -> run lama disimpan, run baru dimulai (flow `free` kecuali ada perintah flow). Bila `paused` atau `running` -> run yang sama berlanjut. Perintah flow (`FLOW_CMD`) selalu memulai run baru. Pesan sistem yang disuntik (`<task-notification>` dll.) selalu melanjutkan run yang sama.
- Sesi baru di folder yang sama (event `SessionStart` atau prompt dengan `session_id` berbeda): run lama disimpan, run baru milik sesi itu. Event lain dari sesi lama: hanya pertanyaan/izin yang diproses (`applyForeign`, agar tidak terlewat); sisanya diabaikan dan dicatat sekali di Log.
- `Reset run` hanya untuk proyek itu.
- Risiko tercatat: Claude Code mengirim Stop di tengah pekerjaan bertahap. Dari 73 Stop nyata, sebagian besar membawa `background_tasks` berjalan (tertangani), 8 berakhir dengan `?` (tertangani heuristik), tetapi ada yang menunggu persetujuan tanpa tanda tanya ("baru saya mulai setelah kamu setuju."), yang di luar flow akan terbaca Selesai. Diuji dengan replay event nyata di T12; aturan disesuaikan di sana. Lihat `docs/adr/0001-batas-run.md`.

### 5.2 Gagal

Sumber: (a) `PostToolUse` Agent/Task dengan `is_error`, `error`, atau `interrupted` -> node agent itu `failed` + alasan 1 baris; (b) item backlog berstatus `failed` -> item Gagal dengan alasan dari backlog; (c) `StopFailure` atau `PostToolUseFailure` bila versi Claude Code mengirimnya (dicek di T12 sebelum ditambah ke `hooks.json`). Hilang saat agent itu mulai lagi atau item backlog berubah status. Error tool biasa (Bash gagal) tetap masuk Percakapan sebagai error, bukan Gagal.

### 5.3 Item pemberitahuan (`attention.js`)

Kunci = identitas pemicu PRD 4a, bentuk `jenis:sumber:kejadian`. `sumber` = `<session>:<agent_id|main>` atau `backlog`; `kejadian` = `tool_use_id` bila ada (unik global), selain itu `<runId>.<n>` dengan `n` nomor urut kejadian sejenis di run itu. Kunci yang sama tidak pernah menghasilkan item kedua.

| Jenis | Muncul bila | Kunci | Hilang bila |
|---|---|---|---|
| question | (1) `PreToolUse` AskUserQuestion (teks + pilihan), atau (2) `Notification` yang menyatakan Claude menunggu (`idle_prompt`) **saat fase `paused` atau `running`** | (1) `q:<sender>:<tool_use_id>`; (2) `q:<sender>:<runId>.w<n>`, `n` = nomor urut Stop di run, sehingga `idle_prompt` berkala (tiap ±60 dtk) setelah Stop yang sama memakai kunci yang sama | event berikutnya (bukan `Notification`) dari pengirim yang sama / prompt berikutnya |
| permission | `PermissionRequest`, atau `Notification` bertipe `permission_prompt` | `perm:<sender>:<tool_use_id>` bila ada, selain itu `perm:<sender>:<runId>.<n>`. `permission_prompt` saat pengirim itu sudah punya pending izin tidak membuat item baru | event berikutnya dari pengirim yang sama (bukan `Notification`) |
| decision | item backlog dengan `checkpoint`, status siap atau berjalan, belum done/rejected/parked | `dec:backlog:<itemId>` | item tidak lagi memenuhi syarat |
| failed | 5.2 | `fail:<sender>:<runId>.<n>` / `fail:backlog:<itemId>` | agent jalan lagi / status item berubah; di klien juga bisa ditutup |
| done | fase menjadi `finished` (bukan `paused`) | `done:<session>:main:<runId>` | run berikutnya mulai |

Bukan pemicu (PRD F5, A12): teks Claude yang berakhir `?` tanpa salah satu sinyal di atas (hanya membuat Jeda, 5.1); `Notification` apa pun saat fase `finished` (mencegah Selesai berbunyi dua kali); `Notification` dengan tipe lain. Pertanyaan teks biasa baru diberitahukan saat `idle_prompt` tiba (±60 dtk), keterlambatan yang diterima PRD. Urutan: terbaru di atas. Label judul: Butuh input (question, permission, decision) > Gagal > Selesai. Jeda tidak punya label judul.

**Penanda masalah tanpa pemberitahuan** (tanpa bunyi, notifikasi, atau angka judul; dihitung server agar aturan ada di satu tempat dan diuji dengan `now()` palsu):

| Penanda | Aturan (PRD 4a) | Field snapshot | Dipakai di |
|---|---|---|---|
| Agent diam | node `running` dan `now - lastEventAt > 10 mnt` | node: `lastEventAt`, `quiet` (bool). Sapuan server tiap 30 dtk menandai proyek kotor bila ada node yang melewati batas, agar penanda muncul walau tidak ada event | node "Diam <n> mnt" (F2), indikator (a) (F3), peringatan atas detail (F4); `n` dihitung klien dari `lastEventAt` |
| Token boros | `prev` ada dan `eq > 1,5 x prev.eq` (selisih > +50%) | `tokens: {eq, prevEq, deltaPct, boros}`; baris Riwayat: `deltaPct`, `boros` (6) | indikator (c) "Boros" (F3), baris Riwayat (F8) |

Batas 10 menit dan 150% adalah konstanta server (A13: tidak bisa diatur di layar). Pembanding dihapus saat run berjalan -> `prev = null`, sehingga selisih dan Boros hilang untuk run itu (7.5).

### 5.4 Progres (indikator b)

1. `docs/backlog.json` terbaca: persen berbobot `s=1, m=2, l=4` (default m), item `parked` dan `rejected` tidak dihitung, `pct = bobot done / bobot total`. Label "Backlog N dari M item".
2. Tanpa backlog, ada flow dengan langkah wajib: langkah wajib yang sudah jalan / total. Label "Langkah wajib N dari M".
3. Tanpa keduanya: `pct = null` (tampil "-").

### 5.5 Token (indikator c) dan pembanding

- Setara input = `in + cc*1,25 + cr*0,1 + out*5` (rumus 1.7.1), dijumlah atas semua node + sesi utama. `eq = null` bila belum ada usage terbaca sementara sudah ada aktivitas (tampil "menunggu data").
- Pembanding dicari sekali saat run mulai: `store.previous(project, flow, beforeId=runId, withAgents)` = run terbaru proyek dan flow yang sama, dengan `tokens_eq > 0`, dan untuk flow `free` sama-sama memakai agent atau sama-sama tidak (agar tanya-jawab singkat tidak menjadi pembanding run besar). Tidak ada -> tanpa selisih.
- `deltaPct = round((eq - prev.eq) / prev.eq * 100)`. Durasi dibanding dengan cara yang sama di Ringkasan.

### 5.6 Ringkasan run

Dibuat server saat `finished`, disimpan di `state.summary` (ikut tersimpan ke Riwayat): `auto` (ada agent jalan atau file berubah; PRD F6 v1.1), `result`, `failedAgent`, `steps[]` (dilewati dan gagal di atas), `tokens`, `durMs`, `prev`, `files[]`, `decisions[]` (item decision + question terbuka). Klien membuka otomatis sekali per `runId` bila `auto`.

### 5.7 Agent dikenali dari folder + flows.json

- Sumber definisi: `plugins/*/agents/*.md` (ryama-kit, saudara folder plugin ini), `~/.claude/agents/*.md`, `<key>/.claude/agents/*.md`. Frontmatter: `name`, `description`, `model`, `effort`, `tools`, `skills` (bentuk `[a, b]` **dan** daftar YAML `- a`; 1.7.1 hanya membaca bentuk pertama sehingga skill `be`, `cyber`, `qa` hilang).
- Crew (node yang tampil sejak awal) = node `free` di `flows.json` + agent dari folder plugin ryama-kit + agent dari `<key>/.claude/agents`. Agent dari `~/.claude/agents` hanya muncul bila jalan (penanda "di luar flow").
- Tampilan: `flows.json.agents[name] = {label, role, icon}` (pindahan `DN`, `ROLE`, `ICONS` dari index.html). Tanpa entri: label = nama, peran = kalimat pertama `description`, ikon umum.
- Posisi: `col/row` dari `flows.json`; agent baru tanpa posisi diletakkan di kolom fase 1-3 yang paling sedikit isinya, baris kosong berikutnya. Server mengirim `crewMeta` (field 1.7.1) sehingga klien tidak menghitung posisi.
- Cache per mtime folder; dipindai ulang saat `SessionStart` dan maks tiap 30 dtk. Agent baru muncul pada sesi berikutnya tanpa ubah kode (F2 AC2).

## 6. API

Semua endpoint: tanpa login (PRD: satu pemilik, lokal), dilindungi guard lokal (bagian 8). Galat berbentuk `{"error":"kode","message":"teks"}`. `p` opsional di mana pun; tanpa `p` = proyek terbaru aktif (kompatibel 1.7.1). `p` salah bentuk -> 400 `bad_project`; bentuk benar tapi tidak dikenal -> 404 `project_not_found`. Endpoint yang butuh run hidup (`/detail`, `/report`, `/reset`) untuk proyek yang hanya ada di Riwayat -> 404 `not_live`. `/state` tanpa `p` dan tanpa proyek aktif -> 200 snapshot kosong (`live:false`), seperti 1.7.1.

| Metode | Path | Request | Response | Galat | Catatan |
|---|---|---|---|---|---|
| GET | `/` | `?p=`, `?v=riwayat`, `?all=1` (dibaca klien) | `index.html` | - | Tanpa `p`: Daftar proyek; tepat satu proyek aktif -> klien `location.replace('?p=..')` |
| GET | `/projects` | - | `{latest, projects:[{id, name, shortPath, path, lastEventAt, active, phase, running:[label], progress:{pct,label}, tokensEq, attention:{input, failed, done, items:[{key, kind, text}]}}], inactive:[{id, name, shortPath, lastEventAt}]}`; `projects` urut butuh input lalu terbaru; `attention.items` hanya jenis Butuh input dan Gagal, maks 5 (untuk notifikasi lintas proyek, 7.2); `inactive` dari `store.projects()`, maks 50 | 403 | Baru |
| GET | `/state` | `?p=` | snapshot (bentuk 1.7.1 + `project`, `live`, `phase`, `attention`, `progress`, `tokens`, `summary`, `pending` legacy). Proyek tidak aktif yang dikenal di Riwayat: `live:false`, `lastEventAt`, isi = run tersimpan terakhir | 400, 403, 404 | Tetap |
| GET | `/stream` | `?p=` atau `?list=1` | SSE: pesan default = snapshot; `event: projects` = isi `/projects` (saat berubah, maks 1/dtk); `: ping` tiap 20 dtk | 400, 403, 503 `too_many_streams` (> 50) | Tanpa `p`: mengikuti proyek terbaru, pindah otomatis saat proyek lain lebih baru. `p` valid tapi belum ada: koneksi dibuka, snapshot dikirim begitu proyek muncul |
| GET | `/detail` | `?p=&id=` (`__main`, `__all`, `__convo`, atau `^[a-z0-9][a-z0-9:._-]{0,63}$`) | detail 1.7.1 (`node`, `task`, `result`, `events`, `files`, `usageNote`, atau `convo`) | 400 `bad_id`, 404 | Tetap |
| POST | `/reset` | `?p=` | 204 | 403, 404 | Tetap, per proyek |
| GET | `/report`, `/report.md` | `?p=` | HTML / teks | 404 | Tetap (laporan run live, bukan Laporan token) |
| GET | `/report/tokens.json` | `?p=` **wajib** | `{project:{id,name}, runs, limit:200, unanalyzed, top:[{kind:'agent'|'item', name, eq, pct}] (3), totals, perRun[], perAgent[], costliest[], main}` | 400 `bad_project` (tanpa `p` atau salah bentuk), 404 `project_not_found`, 404 `no_runs` | [SEC] Laporan token F12. Tanpa `p` ditolak (pengecualian aturan "tanpa p = terbaru") agar tidak pernah melaporkan proyek lain. Efek samping: tulis salinan markdown (8.1) |
| GET | `/report/tokens.md` | `?p=` wajib | teks markdown yang sama | sama | Untuk dibaca AI/manusia; isi sama dengan file salinan |
| GET | `/history` | `?p=`, `?all=1` | `{kind, current, liveIds:[..], liveId, groups:[{projectId, name, count}], rows:[{..., projectId, deltaPct, boros}]}` (maks 60 baris) | 400 | Tetap + field baru; `liveId` = run live proyek `p`; `count` = jumlah run tersimpan proyek (untuk tombol Laporan token); `deltaPct`/`boros` dihitung terhadap pembanding baris itu (5.3, 5.5) |
| GET | `/history/get` | `?id=` (angka) | `{id, project, state, convo}` | 400, 404 | Tetap |
| POST | `/history/rescan` | `?id=` (angka) | `{ok:true, agents, calls}` | 400 `rescan_failed`, 403, 404 `not_found`, 409 `run_live` (isi galat: `{ok:false, error:<kode>}`, tanpa pesan mentah) | [SEC] "Analisis ulang" (F8 butir 5); membaca transkrip yang tercatat di run dengan aturan path `usage.js` |
| POST | `/history/delete` | `?id=` | 204 | 400, 403, 404, 409 `run_live` | Tetap; menolak run live proyek mana pun. Konfirmasi satu kali di klien (A15) |
| POST | `/event` | JSON payload hook, maks 4 MB | 204 | 400 `bad_json`, 403, 413 `too_large`, 415 `bad_content_type` (Content-Type bukan `application/json`) | [SEC] Tetap; payload dicatat ke `events.jsonl` |
| GET | `/health` | - | `{ok:true, build, version}` | - | `build` dari `build-id.js` (semua file server + public) |
| POST | `/quit` | - | 200 `bye` | 403 | [SEC] Tetap (dipakai start-server untuk ganti build) |
| GET | `/css/*`, `/js/**`, `/fonts/*`, `/boot.js`, `/favicon.svg` | - | file | 404 | [SEC] whitelist ekstensi `.html .js .css .woff2 .svg .json` |

Header semua respons: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`. HTML ditambah CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'` (`unsafe-inline` hanya untuk atribut `style` posisi node; tidak ada skrip inline).

Siaran: tiap proyek menyiarkan snapshot maks 1 per 250 ms (trailing), hanya ke penonton proyek itu. Pembaruan sampai di layar < 1 dtk (F2 AC1).

## 7. Alur utama

### 7.1 Event hook ke layar
1. Hook Claude Code -> `send.js` -> `POST /event` (timeout 800 ms, tidak pernah memblokir Claude).
2. `guard.checkRequest` -> append ke `events.jsonl` -> `registry.ingest(ev)`: ikat sesi -> proyek -> `run.apply(ev)` (atau `applyForeign`).
3. `usage.js` membaca bagian baru transkrip (maks 1x/4 dtk per agent) -> `run` diperbarui.
4. `projects.js` menandai proyek kotor -> siaran 250 ms: `snapshot()` + `backlog.summarize()` + `attentionOf()` -> SSE ke penonton `?p=` itu dan `/stream` legacy bila proyek ini terbaru; `event: projects` ke semua.
5. Klien: `graph.update`, `indicators`, `alerts`, `notify.sync`, panel aktif. Bila detail terbuka: `/detail` di-debounce 500 ms.

### 7.2 Membuka viewer
1. `GET /` -> `app.js` membaca `?p`. Tanpa `p`: `GET /projects`; tepat satu aktif -> `replace('?p=id')` (tab itu terikat ke proyek dan tidak ikut melompat); selain itu Daftar proyek (aktif di atas, urut Butuh input/Gagal lalu terbaru; bagian "Proyek tidak aktif" dari `inactive`) + `/stream?list=1`.
2. Dengan `p`: `/stream?p=id` saja; tab tidak pernah berpindah proyek walau proyek lain lebih baru aktif (hanya `/stream` tanpa `p` yang mengikuti terbaru, untuk klien lama). Judul `<proyek> · Flow Viewer`; angka judul hanya dari `attention` proyek ini.
3. Proyek tidak aktif (dikenal di Riwayat): snapshot `live:false` -> tata letak Live hanya baca dari run terakhir + label "Tidak aktif sejak <waktu>" + Riwayat proyek itu; tanpa pemberitahuan. Begitu proyek mengirim event, server menyiarkan snapshot `live:true` di stream yang sama dan klien berpindah ke live tanpa muat ulang.
4. `p` tidak dikenal sama sekali: "Proyek ini belum punya kejadian." + tautan Daftar proyek dan Riwayat; stream tetap menunggu dan tampilan muncul otomatis saat event pertama tiba.
5. Proyek lain (A14): pengalih proyek diisi dari `event: projects`. Untuk tiap `attention.items` proyek lain dengan kunci baru, pengalih memberi penanda pada proyek itu dan `notify.js` memunculkan notifikasi desktop bernama proyek itu satu kali (kanal desktop di 7.3), **tanpa bunyi** dan tanpa mengubah angka judul tab ini.

### 7.3 Pemberitahuan (klien, `notify.js`)
1. Tiap snapshot: `items = state.attention`. "Sudah dilihat" disimpan di `localStorage fv-seen:<p>` (bersama untuk semua tab, tahan muat ulang; maks 300 kunci, buang yang > 7 hari) sebagai kunci -> `{d, s}` (kanal desktop dan bunyi). Klaim dilakukan di dalam `navigator.locks.request('fv-notify')` (periksa lalu tulis, atomik antar-tab; fallback tanpa Web Locks: tulis lalu cek ulang). Bunyi: hanya tab proyek itu yang mengklaim kanal `s` (bila `fv-sound` tidak `0`). Desktop: tab mana pun yang lebih dulu mengklaim `d` (bila izin `granted` dan `document.hidden`), `tag = <p>:<kunci>` sebagai lapis kedua agar OS tidak menampilkan dua. Hasil: satu kunci = paling banyak satu bunyi dan satu notifikasi desktop (PRD 4a).
2. Judul: `(n) <label> · <proyek>`; berkedip 1 dtk bila `document.hidden`. Saat tab terlihat: item failed/done ditandai dilihat dan keluar dari hitungan judul; question/permission/decision tetap sampai hilang di server.
3. Bunyi: WebAudio oscillator 150 ms (tanpa file); gagal karena autoplay -> diam. Izin desktop hanya diminta lewat tombol (A7). Klik notifikasi -> `window.focus()`.

### 7.4 Run selesai
1. Stop terakhir + 2 dtk sepi -> fase `finished` -> `summary` dibuat -> item `done` -> run disimpan.
2. Klien: pemberitahuan Selesai; bila `summary.auto` dan `fv-sum:<runId>` belum ada -> lapisan Ringkasan run terbuka sekali.
3. Prompt baru -> run baru; lapisan yang masih terbuka menampilkan "Run baru sudah berjalan".

### 7.5 Riwayat
Daftar resmi perilaku F8 (PRD v1.2) dan pendukungnya:

| # | Perilaku | Alur | Endpoint / selector |
|---|---|---|---|
| 1 | Daftar run proyek ini | `/history?p=` -> maks 60 baris, terbaru di atas: judul/prompt, jam + "x lalu", setara, durasi, "sedang berjalan" (`liveIds`), tanda "Boros" (ikon + teks) bila `boros` | `GET /history`; `#tabs button[data-v=history]` (10.2) |
| 2 | Semua proyek / hanya proyek ini | `?all=1` -> baris dikelompokkan per `projectId`, kepala grup dari `groups` | `GET /history?all=1` |
| 3 | Buka run lama | "Buka" -> `/history/get` -> tata letak Live hanya baca + tombol kembali ke live; pita indikator tetap dari stream live (UX U4). Baris `liveIds` -> "Lihat live" (tanpa fetch) | `GET /history/get` |
| 4 | Banding dua run | centang dua -> `/history/get` x2 -> setara, durasi, agent, file, selisih persen (PRD 4a); flow beda -> peringatan | `GET /history/get` |
| 5 | Analisis ulang | tombol per baris -> `POST /history/rescan?id=` -> status di tombol (berjalan, selesai: n pemanggilan, gagal) | `POST /history/rescan` |
| 6 | Hapus | baris bukan live: "Hapus" -> **satu** konfirmasi inline -> `POST /history/delete` -> baris hilang. Baris live (`liveIds`, proyek mana pun): tombol nonaktif + "Run sedang berjalan"; server tetap menolak 409 `run_live`. Setelah hapus: run live mana pun yang pembandingnya id ini -> `prev = null`, siaran ulang | `POST /history/delete` |
| 7 | Ringkasan run lama | `state.summary` dari `/history/get` -> lapisan Ringkasan (F6) | `GET /history/get` |
| 8 | Laporan token | satu tombol "Laporan token" per proyek (kepala Riwayat selebar layar; kepala tiap grup di mode semua proyek), bukan per baris. `count = 0` -> nonaktif + "Belum ada run untuk dilaporkan". Tekan -> "Menyusun laporan..." (tombol terkunci) -> `GET /report/tokens.json?p=<projectId>` -> lapisan di atas Riwayat dirender lewat `dom.js` (teks biasa): tiga penyumbang terbesar dulu, lalu tabel; `unanalyzed > 0` -> keterangan + cara "Analisis ulang". Galat -> pesan biasa + "Coba lagi". Tutup: Esc, Tutup, klik di luar; Riwayat di bawahnya tidak dirender ulang, jadi gulir dan centang tetap | `GET /report/tokens.json` |

Prune 200 run per proyek terjadi di `store.save` (4.2). Riwayat kosong -> "Belum ada run tersimpan." + kapan run disimpan.

## 8. Keamanan

### 8.1 Permukaan [SEC]
- [SEC] Notifikasi lintas proyek (7.2 langkah 5): teks pertanyaan proyek lain ikut di `event: projects` ke semua tab; sama-sama lokal, tetap teks biasa.
- [SEC] `POST /event`: satu-satunya pintu masuk data; isinya mengendalikan path yang dibaca server (`cwd`, `transcript_path`, `agent_transcript_path`).
- [SEC] Pembacaan file dari path event: transkrip (`usage.js`), `docs/backlog.json` dan `.claude/agents/*.md` di folder proyek (`backlog.js`, `agents.js`).
- [SEC] `POST /reset`, `/history/delete`, `/history/rescan`, `/quit`: aksi yang mengubah data, membaca transkrip, atau mematikan server.
- [SEC] Laporan token menulis `<key>/.flow-viewer/laporan-token.md` (+ `.gitignore` berisi `*` di folder itu). `key` hanya dari registry/store hasil `resolve(p)`, **tidak pernah** dari parameter URL berupa path; nama file tetap; gagal tulis dilewati diam-diam. Versi berjalan masih menerima `?project=<path>` mentah dan jatuh ke folder kerja terakhir bila kosong: wajib diganti ke `?p=`.
- [SEC] `GET /state`, `/stream`, `/detail`, `/history/get`, `/report`: berisi prompt, jawaban, diff kode (data pribadi).
- [SEC] File statis: path dari URL.
- [SEC] Render klien: teks agent, percakapan, diff, nama file, judul backlog (bisa berisi HTML hasil prompt injection dari web yang dibaca agent).
- [SEC] Notifikasi desktop dan judul tab: teks pertanyaan agent.
- [SEC] Penyimpanan lokal: `history.db`, `events.jsonl` (berisi seluruh payload hook).

### 8.2 Threat model

| Aset | Penyerang | Ancaman utama | Kontrol |
|---|---|---|---|
| Percakapan, prompt, diff kode | Situs web jahat yang dibuka di browser yang sama | DNS rebinding untuk membaca `/state` dan `/stream` | Server hanya bind `127.0.0.1`. Guard: header `Host` wajib `localhost:<port>`, `127.0.0.1:<port>`, atau `[::1]:<port>`; selain itu 403 `bad_host` untuk semua path. Tanpa header CORS, jadi baca lintas-origin diblokir browser |
| Integritas tampilan dan notifikasi | Situs jahat (CSRF) | `POST /event` palsu (notifikasi palsu, XSS tersimpan), `/reset`, `/history/delete`, `/quit` | Guard POST: bila header `Origin` ada, wajib sama dengan origin viewer; `Sec-Fetch-Site: cross-site` ditolak; 403 `bad_origin`. Hook (`send.js`) dan skrip uji tidak mengirim `Origin`, jadi tetap jalan |
| File lain di disk | Event palsu atau payload hook yang aneh | Server membaca file sembarang lewat `transcript_path` atau `cwd` | `transcript_path`/`agent_transcript_path` wajib berakhiran `.jsonl` dan berada di bawah `~/.claude` (atau `CLAUDE_CONFIG_DIR`) setelah `path.resolve`; selain itu diabaikan. Dari `cwd` hanya dua path tetap yang dibaca (`docs/backlog.json` maks 2 MB, `.claude/agents/*.md` maks 64 KB per file). Isi file tidak pernah dikirim mentah; hanya field terpilih |
| File di folder plugin | Pengunjung viewer | Path traversal lewat URL statis | `decodeURIComponent` -> tolak bila ada `\0`, `..`, atau `\` -> `path.resolve(PUBLIC, '.' + p)` wajib di dalam `PUBLIC + sep` -> whitelist ekstensi -> 404. `?p=` dan `id` divalidasi regex dan hanya dipakai sebagai kunci peta |
| Browser pemilik | Teks agent hasil prompt injection | XSS saat merender percakapan, hasil, diff, judul backlog | Semua HTML dibuat lewat tag `html` di `dom.js` yang meng-escape tiap sisipan (`& < > " '`); `raw()` hanya untuk konstanta ikon. Uji: grep `innerHTML` di luar `dom.js` = 0. CSP tanpa skrip inline sebagai lapis kedua. Judul tab dan Notification memakai teks biasa |
| Riwayat pribadi | Commit tidak sengaja | `history.db` atau `events.jsonl` masuk git | Data di `~/.claude/flow-viewer` (di luar repo). `.gitignore` plugin untuk `*.db`, `*.db-*`, `events*.jsonl`, `history/`, `server.log`. Fixture uji dari event nyata disamarkan (path, isi prompt) sebelum masuk `test/fixtures` |
| Ketersediaan viewer dan Claude Code | Payload besar atau banyak tab | Memori habis, hook lambat | Body `/event` maks 4 MB (413). Maks 50 koneksi SSE. Batas per run: convo 150, event per agent 400, log 200, file 40 di snapshot. Siaran di-throttle. `events.jsonl` dirotasi 20 MB ke `events.1.jsonl` (satu generasi; `FLOW_VIEWER_LOG_MAX` hanya untuk uji). `send.js` tetap timeout 800 ms dan selalu exit 0 |
| Mesin lain di jaringan | Perangkat di LAN | Akses ke port 4777 | Bind `127.0.0.1` saja; tidak ada opsi bind lain |

Rahasia: tidak ada (tanpa login, tanpa API eksternal, tanpa kunci). Upload dan pembayaran: tidak ada. Rate limit: tidak dipakai (lokal, satu pengguna); batas ukuran dan jumlah koneksi di atas cukup.

## 9. Performa (12 agent, 3 proyek)

- Server: siaran per proyek maks 4/dtk; snapshot target < 120 KB (log dipotong 100 entri di snapshot, detail lengkap tetap lewat `/detail`). Transkrip dibaca **inkremental** dari offset terakhir (1.7.1 membaca ulang seluruh file; transkrip sesi panjang bisa puluhan MB, x 13 kunci x 3 proyek). Riwayat disimpan maks 1x/3 dtk per proyek.
- Klien: `graph.update` membandingkan tanda tangan per node dan hanya menulis node yang berubah; konektor dihitung ulang hanya saat status/posisi berubah; ticker 1 dtk hanya memperbarui teks durasi. `patch()` tidak menulis DOM bila string sama.
- Target terukur (T28): p95 event -> DOM < 1 dtk pada 3 proyek x 12 agent x 30 event/dtk selama 60 dtk; render satu pembaruan < 50 ms di 1440 px; RSS server < 200 MB.

## 10. Kompatibilitas

### 10.1 Endpoint
Semua endpoint 1.7.1 tetap dengan arti sama; tanpa `p` mengikuti proyek terbaru (F1 AC3). Bentuk snapshot adalah superset 1.7.1 (`nodes`, `main`, `crew`, `crewMeta`, `crewEdges`, `edges`, `expected`, `flow`, `title`, `runId`, `finished`, `prompt`, `log`, `backlog`, `fileList`, `pending`, `convoN`, `skillCalls`, `mainSkills`). `pending` diisi dari pending pertama agar klien lama tetap benar.

### 10.2 Id elemen dan selector skrip uji
Id 1.7.1 dipertahankan sesuai UX U1. Selector yang dipakai skrip uji lama:

| Selector / kunci | Dipakai di | v2 | Pengganti bila berubah |
|---|---|---|---|
| `#theme`, `localStorage fv-theme`, `html[data-theme]` | shots.js, r2run.js, states.js | tetap | - |
| `#zin`, `#zout`, `#zlbl`, `#zfit`, `#zwrap .zoom` | shots.js, probe.js | tetap | - |
| `#more`, `#pmenu[hidden]`, `#reset` | shots.js | tetap | - |
| `.node[data-id=<agent>]`, `#canvas .node`, kelas `st-<status>`, `.off`, `.edge`, `.edge.faint` | shots.js, skip.js | tetap; status baru `st-input`, `st-failed` | - |
| `[data-tab=aktivitas]`, `[data-tab=files]`, `.rh` | shots.js, `test/ui/ui.test.mjs` | **berubah di v1.2**: tab detail dihapus (10.2a) | `[data-sec=langkah]`, `[data-sec=files]`; `.rh` tetap |
| `#drawer[hidden]` + Enter/Esc | shots.js | tetap (mode detail di `#side`) | - |
| `#side`, `#tchat` | shots.js, mob.js | tetap; `#tchat` menciutkan panel menjadi rel (bukan `display:none`) | uji membaca `#side.collapsed` |
| `#now`, `#chatcard`, `header`, `main` | mob.js, r2run.js | tetap (`#now` = sel Siapa kerja di `#strip`) | - |
| `#tabs button[data-v=token|backlog|skill|log]` | shots.js | **berubah**: `#tabs` hanya `live` dan `history` | `#rail button[data-v=token|backlog|skill|log|chat|files]` |
| `#tabs button[data-v=history]` | shots.js | tetap | - |
| `.rc[data-id]` (kartu hasil, daftar < 900 px) | shots.js | **dihapus** (UX U3) | `.node[data-id]` (daftar kartu < 900 px memakai kelas node) |
| `GET /` langsung tampilan live | semua | tetap bila tepat satu proyek aktif (fixture uji satu proyek) | `/?p=<id>` untuk banyak proyek |
| `POST /event` tanpa header | feed.js, replay.js | tetap | - |
| Buka `index.html` lewat `file://` (state terputus) | r2run.js, states.js | tetap memperlihatkan bilah terputus (modul ES tidak termuat dari `file://`; bilah ditulis di HTML statis, terlihat default) | - |

Skrip lama dipindah ke `test/ui/` dengan selector baru (T26).

### 10.2a Perubahan id dan selector untuk UX v1.2
Disetujui pemilik 2026-11-03 (UX §1 persetujuan 1-3). Kolom "Build sekarang" = `server/public` yang berjalan (build 08ed9716dc6e) dan `test/ui/ui.test.mjs`. Id 1.7.1 `#dh`, `#dtabs`, `#dbody` (UX U2) tidak ada di build sekarang dan tidak dipakai uji mana pun, jadi tidak dibuat ulang; `#drawer` tetap satu-satunya wadah detail yang diandalkan uji.

**Detail agent: satu kolom (UX §6.2)**

| Build sekarang | v1.2 | Catatan untuk `fe` / `qa` |
|---|---|---|
| `#drawer` (dibungkus `panel.js` saat `ctx.key='agent'`) | tetap | wadah; `waitForSelector('#drawer')` tetap sah |
| `#agtabs` + `button[data-tab=ringkasan\|panggil\|aktivitas\|files\|hasil]` | **dihapus** | uji tidak boleh lagi mengklik `[data-tab]`; `on($('#pi'),'click','[data-tab]')` di `app.js` dihapus |
| `ctx.agentTab` (di-reset ke `ringkasan` oleh `selectAgent`) | **dihapus**, diganti status lipat | penyebab T4 2 langkah (UX Lampiran A) hilang bersama field ini |
| `localStorage fv-dtab` | diganti `fv-dsec` = JSON `{<sec>: true\|false}`, satu untuk semua agent | nilai `fv-dtab` lama diabaikan (tidak dimigrasi); bawaan: `hasil` dan `files` terbuka, sisanya terlipat |
| kepala: `.chs` (status + model) | `#dhead`: nama, status (ikon + teks), peran satu baris, tombol tutup `[data-act=pclose]` tetap | |
| (tidak ada) | `#dwarn` berisi `.dw[data-kind=failed\|input\|quiet\|model\|model-unproven\|skill]`, hanya dirender bila ada | aksi: `[data-act=dstep]` (Lihat langkah yang gagal/terakhir -> buka `langkah`, gulir ke `.rh.err` atau baris terakhir), `[data-act=dskill]` (buka `skill`) |
| (tidak ada) | `#dans`: satu kalimat jawaban | Gagal tanpa alasan: "Gagal tanpa alasan tercatat" |
| `.grid2 .box` (token, durasi) | `#dnums`: tiga angka (durasi, setara, putaran) | tanpa usage: "menunggu data" |
| isi tab Ringkasan/Pemanggilan/Aktivitas/File/Hasil | `section.dsec[data-sec=hasil\|files\|tugas\|langkah\|skill\|model\|token\|def]`, urutan tetap; kepala `.dsec > h3 > button[aria-expanded]` | Pemanggilan pindah ke `token`; Aktivitas = `langkah`; Konfigurasi dipecah ke `model` dan `skill`; Peran lengkap ke `def` |
| `#drawer .row` (baris file, setelah klik tab File) | `[data-sec=files] .row`, terlihat tanpa klik | klik baris -> `.diff` di bawah baris itu (di tempat) |
| `.rh` (setelah klik tab Aktivitas) | `[data-sec=langkah] .rh`; galat `.rh.err` | |
| "Tampilkan semua" | `[data-act=dmore][data-sec=<sec>]` | memperluas di tempat |
| agent belum jalan | `#dans` "Belum jalan di run ini." + hanya `def`, `model`, `skill` dirender | bagian lain tidak ada di DOM (bukan kosong) |

Uji pengganti "detail agent: tab aktivitas dan files": klik `.node[data-id=prd] .tile` -> `#drawer` -> `[data-sec=files] .row` >= 1 tanpa klik lain -> klik `[data-sec=langkah] h3 button` -> `.rh` >= 1 -> klik node lain -> `[data-sec=langkah] h3 button[aria-expanded=true]` tetap (T4: 1 langkah). Skenario `failed`: `#dwarn .dw[data-kind=failed]` memuat "Gagal:" (T9).

**Rel, bilah atas, Riwayat selebar layar (UX §4, §6.4)**

| Build sekarang | v1.2 | Catatan |
|---|---|---|
| `#rail button[data-v=chat\|backlog\|files\|skill\|token\|agent\|history\|log]` | `#rail button[data-v=chat\|backlog\|files\|skill\|token\|log]` | `agent` dan `history` keluar dari rel (`TABS` di `panel.js`). Uji "rail membuka panel" memakai enam kunci ini. Detail dibuka hanya dari node |
| Riwayat = panel `#pi` (`ctx.key='history'`) | `#tabs` di bilah atas: `button[data-v=live]`, `button[data-v=history]` (`aria-pressed`) | sesuai baris `#tabs button[data-v=history]` di 10.2; `?v=riwayat` di URL |
| isi Riwayat di `#pi` | `section#history` di dalam `main`, menggantikan `#stage` + `#side` saat terlihat; `body.v-history` | pita tetap di atas. Delegasi klik Riwayat pindah dari `#pi` ke `#history` |
| (tidak ada) | `#history > header` (judul, `[data-act=hall]` tetap, tombol Laporan token), `#hstats` (ringkasan angka), `#hcmp` (area banding, hanya saat 2 run), `#htrend`, `#hrows` | `#hsum` tidak dipakai di sini: id itu sudah tombol Ringkasan di `#histbar` |
| baris `.ck[data-run=<id>]` | `.hrow[data-run=<id>]`; selisih `.hdelta`, tanda `.boros` (ikon + teks) | |
| `[data-cmp=<id>]` (centang) | tetap | centang ketiga melepas yang paling lama (tetap) |
| `[data-act=hopen]` | tetap ("Buka" / "Lihat live") | |
| (tidak ada) | `[data-act=hpair][data-id]` "Bandingkan" | mencentang run itu + pembandingnya; tidak dirender bila tanpa pembanding |
| `[data-act=hscan]` di baris | tetap, pindah ke menu baris | menu: `[data-act=hmenu][data-id]` -> `[data-act=hrsum]` Ringkasan, `[data-act=hscan]`, `[data-act=hdel]` |
| (Hapus belum ada di build) | `[data-act=hdel]` -> konfirmasi di tempat `[data-act=hdelok]` "Yakin hapus run ini?" | **satu** konfirmasi (A15). Run live: `hdel` tidak dirender, teks "Run sedang berjalan" |
| `#histbar` (bilah run lama), `#hsum`, `#hback` | tetap | itu Run lama, bukan Riwayat |

**Laporan token: satu tombol per proyek (UX §6.5, F12)**

| Build sekarang | v1.2 | Catatan |
|---|---|---|
| `[data-act=trep][data-project=<path mentah>]` di **tiap** baris | `[data-act=trep][data-p=<projectId>]` hanya di `#history > header`, atau di kepala grup `.hgroup[data-p]` pada mode semua proyek | uji: `.hrow [data-act=trep]` = 0; mode satu proyek: `#history [data-act=trep]` = 1. `count = 0` -> `disabled` + "Belum ada run untuk dilaporkan" |
| `fetch('/report/tokens.md?project=...')` | `GET /report/tokens.json?p=<projectId>` | [SEC] `?project=` dihapus (8.1); tanpa `p` server 400 |
| lapisan `#modal.on #mc.wide` | tetap + `#mc[data-layer=report]`; tiga penyumbang `#rtop`; Tutup `[data-act=mclose]` tetap; galat `[data-act=rretry]` "Coba lagi" | memuat: tombol `trep` `aria-busy=true` + `disabled`. Tutup -> fokus ke tombol `trep` asal; `#history` tidak dirender ulang |
| kolom % dari mentah | % dari setara (persetujuan 3) | tidak ada id baru; diuji di `test/unit/tokens.test.js` |

### 10.3 Riwayat
Daftar resmi perilaku Riwayat (PRD F8 butir 1-8) beserta endpoint pendukungnya dipetakan di tabel 7.5; tabel itu yang dirujuk PRD sebagai pengganti "semua perilaku 1.7.1".

## 11. Strategi uji

| Lapis | Alat | Isi | Kapan |
|---|---|---|---|
| Unit | `node --test test/unit` | `projects` (kunci, ikatan sesi, subfolder, tanpa cwd, slug kembar, 6 jam dengan jam palsu), `run` (fase, debounce, background_tasks, paused vs finished, run baru per prompt), `attention` (tiap jenis, kunci stabil, hilang), `backlog` (bobot, parked), `agents` (frontmatter dua bentuk, agent baru, penempatan), `store.previous`, `guard` | tiap tugas be |
| HTTP | `node --test test/http` | dua proyek bergantian -> `/state?p=` terisolasi (F1 AC1); legacy `/state` `/stream` ikut terbaru (F1 AC3); keamanan: Host jahat, Origin jahat, `%2e%2e`, `?p=../x`, `transcript_path` di luar `~/.claude`, body 5 MB, 51 stream | T11 |
| Replay nyata | `test/replay.js` + log `~/.claude/flow-viewer/events.jsonl` | klasifikasi tiap Stop (selesai/jeda), cwd berpindah, proyek terpisah, tanpa exception | T12, dan setiap aturan fase berubah |
| UI | Playwright `test/ui/*.mjs` + `fixtures/feed.js` | AC F1-F9: update < 1 dtk, 12 agent tanpa tumpang tindih + teks node >= 12 px, status ikon+teks, judul/bunyi/notifikasi (stub `Notification`, `AudioContext`, `visibilityState`), Esc/tema tidak mengubah zoom, Riwayat terpisah, data 1.7.1 maks 2 klik | T26-T27 |
| Visual | audit `ui-craft --lang id`, 900/1440, terang/gelap | kontras AA, hierarki | T27 |
| Beban | `test/perf.mjs` | bagian 9 | T28 |
| Keamanan | agent `cyber` atas permukaan [SEC] | review + hasil uji HTTP | T29 |

## 12. Keputusan arsitektur yang dicatat
- `docs/adr/0001-batas-run.md`: run baru per prompt setelah selesai; Stop dengan langkah wajib tersisa atau pertanyaan = jeda.
- `docs/adr/0002-proyek-diikat-sesi.md`: proyek ditentukan sesi, bukan `cwd` tiap event.
