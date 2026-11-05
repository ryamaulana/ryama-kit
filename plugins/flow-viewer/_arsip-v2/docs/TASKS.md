# TASKS: Flow Viewer v2

Urutan kerja teknis. Tag: `[boilerplate|be|fe|ui|qa]`. Kolom "Butuh" = tugas yang harus selesai dulu. "AC" merujuk kriteria PRD (mis. F1-1 = F1, kriteria pertama) atau bagian ARCHITECTURE (A§). Tiap tugas selesai bila buktinya ada (hasil `node --test`, screenshot, angka).

## Fondasi

| ID | Tag | Tugas | Butuh | AC | Bukti selesai |
|---|---|---|---|---|---|
| T01 | boilerplate | `.gitignore` plugin; `server/build-id.js` (hash mtime semua file `server/` dan `public/`) dipakai `/health` dan `start-server.js`; folder `test/unit`, `test/http`, `test/fixtures`; `node --test` jalan | - | PRD §8 privasi; F1 edge "server restart" | `node --test` hijau (1 uji build-id); `git status` tidak menampilkan `*.db` saat `FLOW_VIEWER_DIR` di dalam repo |

## Server

| ID | Tag | Tugas | Butuh | AC | Bukti selesai |
|---|---|---|---|---|---|
| T02 | be | `agents.js`: katalog per proyek (plugin ryama-kit, `~/.claude/agents`, `<key>/.claude/agents`), frontmatter inline dan daftar YAML, cache mtime, pindai ulang saat SessionStart; `flows.json.agents` (label, peran, ikon dipindah dari index.html); penempatan agent baru | T01 | F2-2, F4 edge, A§5.7 | uji unit: agent baru di folder sementara muncul di `crew`; `be.md` terbaca 5 skill |
| T03 | be | `usage.js`: pindahkan `parseUsage/agentUsage`, baca inkremental per offset, path transkrip dibatasi `~/.claude` + `.jsonl` | T01 | F3-3, A§8.2, A§9 | uji unit: dua kali baca file yang bertambah = total benar; path di luar ditolak |
| T04 | be | `backlog.js`: ringkasan per kunci proyek, cache mtime, bobot s1/m2/l4, parked dan rejected tidak dihitung, maks 2 MB, daftar item keputusan | T01 | F3-2, F3 edge parked, F5 pemicu 2 | uji unit dengan backlog fixture: pct sama dengan hitungan manual |
| T05 | be | `run.js`: pindahkan `handle`, state, detail, convo, report dari `server.js` ke pabrik per run tanpa variabel global; pending menjadi daftar per pengirim; snapshot superset 1.7.1 | T02, T03 | F2-1, F4-3, F9-1, A§10.1 | uji unit: fixture feed.js lama menghasilkan snapshot dengan field 1.7.1 lengkap |
| T06 | be | Fase run: running/paused/finished, debounce 2 dtk, `background_tasks`, run baru per prompt setelah finished, sesi baru = run baru, Gagal (Agent error, backlog failed), `summary` | T05 | F5 pemicu 3-4, F6-1..3, F1 edge sesi sama, A§5.1-5.2, A§5.6 | uji unit per aturan (jam palsu), termasuk Stop dengan background_tasks berjalan |
| T07 | be | `attention.js`: fungsi murni item pemberitahuan (jenis, kunci stabil, teks, pilihan, waktu, kapan hilang) | T04, T06 | F5-1..3, F5-5, F5 edge beberapa pemicu, A§5.3 | uji unit tiap jenis + kunci tidak berubah antar snapshot |
| T08 | be | `store.js`: `previous()`, `projects()`, prune 200 per proyek + 1.000 total, indeks `(project, flow, started_at)`, `runId` monoton | T01 | F3-3, F8-1..2, A§4.2, A§5.5 | uji unit SQLite dan JSON (`FLOW_VIEWER_STORE=json`) |
| T09 | be | `projects.js`: kunci normal, ikatan sesi, cwd di subfolder, tanpa cwd -> terbaru, slug + hash bila kembar, `resolve` termasuk riwayat, aktif 6 jam, eviksi maks 20; snapshot ditambah `project`, `progress`, `tokens` (pembanding), `attention` | T06, T07, T08 | F1-1, F1-2, F1 edge (4 butir), F3-2..3 | uji unit: dua sesi folder beda bergantian terpisah; cwd `docs/mockups` tetap proyek induk |
| T10 | be | `guard.js` + `server.js`: Host/Origin/Sec-Fetch-Site, validasi `p`/`id`, header + CSP, statis aman + whitelist, 413, `/projects`, `?p=` di semua endpoint, `/stream` legacy ikut terbaru + `event: projects`, throttle 250 ms, maks 50 SSE, rotasi `events.jsonl` 20 MB | T09 | F1-1, F1-3, PRD §8, A§6, A§8 | `node --test test/http` hijau (lihat T11) |
| T11 | qa | Uji HTTP: isolasi dua proyek, legacy `/state` `/stream`, keamanan (Host jahat, Origin jahat, `%2e%2e`, `?p=../x`, transkrip di luar `~/.claude`, body 5 MB, 51 stream) | T10 | F1-1, F1-3, A§8.2 | output `node --test test/http` |
| T12 | qa | Replay event nyata (`~/.claude/flow-viewer/events.jsonl`, 3.428 event, 73 Stop): tabel klasifikasi Stop (selesai/jeda/berjalan) vs penilaian manual; cek dukungan `StopFailure`/`PostToolUseFailure`; sesuaikan aturan T06 bila salah > 10% | T10 | F5 pemicu 3, F6-1, risiko A§5.1 | tabel hasil di laporan; fixture tersamar di `test/fixtures/events/` |

## Frontend

| ID | Tag | Tugas | Butuh | AC | Bukti selesai |
|---|---|---|---|---|---|
| T13 | boilerplate | Pecah `index.html`: kerangka markup dengan semua id (A§10.2), `boot.js`, `css/fonts.css` + `fonts/` (dari mockup arah-a), `css/tokens.css`, `css/app.css` kosong, `js/*` modul kosong; `app.js` rute (`?p`, `v=riwayat`, daftar vs proyek, buka otomatis bila satu proyek) | T01 | F7 (tema awal), F1-4, PRD §8 | halaman termuat tanpa error konsol; CSP tanpa pelanggaran |
| T14 | fe | `dom.js` (tag `html` escape otomatis, `raw`, `patch`), `format.js`, `icons.js`, `api.js` (SSE, sambung ulang, bilah terputus + jam pembaruan terakhir) | T13 | A§8.2 XSS, UX §9 Global terputus | uji unit `dom.js` (`<img onerror>` jadi teks); grep `innerHTML` di luar `dom.js` = 0 |
| T15 | ui | `tokens.css` dan `app.css` dasar dari DESIGN §2-4: bilah atas, pita, kotak pemberitahuan, panel, rel, node penuh/ringkas, enam status ikon + teks, kedua tema | T13 | F2-4, F7-1 | screenshot 1440/900 terang/gelap; audit kontras AA |
| T16 | fe | `graph.js`: layout dari `crewMeta`, node penuh/ringkas, konektor, zoom/pan/pas layar, pembaruan berkunci, seleksi, keyboard, crew bawaan saat belum ada run | T14, T15, T10 | F2-1, F2-3, F2-4, F2 edge (4), F4-2 | Playwright: 14 node tanpa tumpang tindih, teks terkecil >= 12 px di 900 dan 1440 |
| T17 | fe | `indicators.js`: Siapa kerja, Progres, Token + selisih, "menunggu data", menempel, jalan pintas ke tab | T16 | F3-1..4 | Playwright: pita tetap terlihat saat gulir panel dan detail terbuka |
| T18 | fe | `panel.js` + `tabs/*` (Percakapan, Backlog, File + diff, Skill, Token, Log + linimasa), rel + lencana, lebar diingat, tertutup default di 900-1199 | T16 | F9-1, UX §4 rel panel, UX §5 lencana rel; rel hanya enam tab (`agent`, `history` keluar, A§10.2a) | daftar data 1.7.1 vs klik (tabel Jangkauan data F9, UX §8) dicentang |
| T19 | fe | `detail.js`: detail agent satu kolom di `#drawer` (UX §6.2, A§10.2a): `#dhead`, `#dwarn`, `#dans`, `#dnums`, lalu `section.dsec[data-sec]` urutan tetap (hasil, files, tugas, langkah, skill, model, token, def); status lipat `fv-dsec` satu untuk semua agent (bawaan hasil dan files terbuka); tanpa `#agtabs`, `[data-tab]`, `ctx.agentTab`; agent belum jalan = `#dans` "Belum jalan di run ini." + hanya def, model, skill; Esc kembali ke tab data, gagal muat + Coba lagi | T18 | F4-1..3, F4 edge | Playwright: zoom dan posisi grafik sama sebelum/sesudah Esc; `[data-sec=files] .row` >= 1 tanpa klik; bagian yang terbuka tetap saat ganti agent (T4: 1 langkah) |
| T20 | fe | `alerts.js` + `notify.js`: kotak pemberitahuan, judul `(n) ... · <proyek>` berkedip, bunyi WebAudio, tombol senyap (diingat), tombol aktifkan notifikasi + tawaran sekali, dedupe kunci, dilihat saat tab terlihat, tanda proyek lain di pengalih | T17, T07 | F5-1..5, F5 edge (4) | Playwright dengan stub `Notification`, `AudioContext`, `visibilityState` |
| T21 | fe | `summary.js`: Ringkasan run otomatis sekali bila `summary.auto`, tombol "Ringkasan", Esc, "Run baru sudah berjalan" | T20 | F6-1..3, F6 edge | Playwright: run tanpa agent tidak membuka otomatis; run dengan agent membuka sekali |
| T22 | fe | `projects.js`: Daftar proyek (urut butuh input dulu, path singkat bila kembar, kosong), pengalih proyek, judul tab | T14, T10 | F1-2, F1-4, F1 edge nama kembar | Playwright dua proyek: daftar dan pengalih benar |
| T23 | fe | `history.js`: Riwayat per proyek + "Semua proyek", tren 12 run, banding + peringatan flow beda, run lama hanya baca, Hapus dengan satu konfirmasi (UX §6.4, A§10.2a), run live tanpa Hapus | T18, T21 | F8-1..2, F8 edge | Playwright: run proyek A tidak tampil di Riwayat B |
| T32 | fe | Backlog F11 (UX §6.3): tab Backlog menjawab bagian macet, keputusan menunggu, item siap berikutnya, persen, selesai/total per bagian; bagian bermasalah di atas dan terbuka; parked/rejected tidak dihitung | T18, T04 | F11 | Playwright: fixture `backlog.json` dengan bagian macet tampil di atas; angka sama dengan T04 |
| T33 | fe | Laporan token F12 (UX §6.5): jawaban "lebih boros?" di atas, angka konsisten dengan pita Token | T18, T17 | F12 | Playwright: angka laporan = sel Token pita |
| T34 | fe | Riwayat selebar layar (UX §6.4, A§10.2a): `#tabs button[data-v=live\|history]`, `section#history` menggantikan `#stage`+`#side` (`body.v-history`), `#hstats`, `#hcmp`, `#htrend`, `#hrows`, `.hrow`, `[data-act=hpair]`, menu baris `hmenu`; `?v=riwayat`; rel tanpa `history` | T23 | F8-1..2 | Playwright: Riwayat terbuka tanpa panel `#pi`; pita tetap terlihat; Bandingkan 1 klik |
| T24 | fe | `theme.js`: tema, menu Lainnya (Reset run dua langkah; tautan Laporan teks hanya bila DESIGN.md terakhir masih memuatnya, endpoint `/report` tetap ada), migrasi `fv-view` lama | T17 | F7-2, F9 | Playwright: ganti tema tidak mengubah zoom dan detail terbuka |
| T25 | ui | Visual Tahap B (DESIGN §8): daftar proyek, Riwayat, run lama, isi tab panel, state kosong/memuat/terputus, di luar flow, < 900 px daftar kartu, notifikasi diblokir | T22, T23, T19 | F7-1, UX §9 | screenshot per layar dan state; audit `ui-craft --lang id` |

## Verifikasi

| ID | Tag | Tugas | Butuh | AC | Bukti selesai |
|---|---|---|---|---|---|
| T26 | qa | Pindahkan skrip uji lama ke `test/ui/` dengan selector baru (A§10.2); `fixtures/feed.js` dengan skenario: kosong, berjalan, butuh input, gagal, selesai, dua proyek, 12 agent | T25 | kompatibilitas PRD §8 | semua skrip lama jalan tanpa error konsol |
| T27 | qa | Uji acceptance F1-F9 Playwright + audit `ui-craft` 900/1440 terang/gelap + ukuran teks node | T26 | semua AC MVP | laporan lulus/gagal per AC + path screenshot |
| T28 | qa | Uji beban `test/perf.mjs`: 3 proyek x 12 agent x 30 event/dtk, 60 dtk | T26 | F2-1, PRD §8 (12 agent, 3 proyek, 1 dtk) | p95 event -> DOM < 1 dtk, render < 50 ms, RSS < 200 MB |
| T29 | qa | Review keamanan agent `cyber` atas permukaan [SEC] + hasil T11 | T11, T27 | A§8 | daftar temuan; tidak ada temuan tinggi terbuka |
| T30 | boilerplate | README plugin, versi 2.0.0, `docs/PROJECT.md` tahap build | T27, T28, T29 | - | `/health` melaporkan versi 2.0.0 |
| T31 | be | (Setelah T12, opsional) Pulihkan run yang belum selesai dari Riwayat bila server diganti build < 15 menit sebelumnya | T12 | F1 edge restart | uji HTTP: restart di tengah flow, progres flow tetap |

Jalur kritis: T01 -> T02/T03 -> T05 -> T06 -> T07 -> T09 -> T10 -> T16 -> T17 -> T20 -> T21 -> T23 -> T25 -> T26 -> T27. T08, T04, T13-T15 bisa paralel dengan server.
