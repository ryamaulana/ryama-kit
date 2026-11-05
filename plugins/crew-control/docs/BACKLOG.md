# Backlog - crew-control

Diperbarui otomatis oleh backlog.js. Jangan edit tangan; ubah lewat perintah atau agent backlog.

**Progres: 9/45 selesai** · berjalan 0 · siap 6 · menunggu 30 · gagal 0

## Siap dikerjakan

| ID | Jenis | Judul | Agent | Nilai/Usaha |
|---|---|---|---|---|
| f06-store-v2-sisanya | be | Penyimpanan v2 (2/2): bukti, pesan, aktivitas agent, aturan izin, push, notifikasi, pengaturan | be | high/m |
| f14-ketat-resume | be | Pengetatan: ketik-lanjut hanya untuk run terakhir Selesai; restart tidak mengubah run tanpa sesi | be | high/m |
| f17-fe-kerangka | fe | Kerangka aplikasi: rute, klien API, tema | fe | high/m |
| rb02-folder-proyek | be | Jelajah dan buat folder proyek di bawah folder kerja | be | high/m |
| rb05-ui-run-baru | ui | Layar Run baru dan Daftar proyek (bangun dan audit dalam satu item) | ui-designer | high/l |
| sc01-jaringan | be | Keamanan jaringan: pengguna Tailscale, CSP, batas laju | be (opus) | high/s |

## Menunggu dependensi

| ID | Judul | Menunggu |
|---|---|---|
| rb03a-conductor-inti | Pengatur run: mesin status, satu run aktif per proyek, kapasitas | f14-ketat-resume |
| rb03b-free-flow | Run prompt bebas dan perintah sesi (FreeFlow) | rb03a-conductor-inti |
| rb04-api-mulai-run | Mulai run lewat API dengan model dan perintah dari tim | rb03b-free-flow, rb02-folder-proyek |
| rb06-fe-run-baru | Menyambung Run baru: ingat folder dan model, Enter untuk mulai | rb05-ui-run-baru, rb04-api-mulai-run, rb02-folder-proyek, f17-fe-kerangka |
| lp01-transkrip | Token dan model per pemanggilan agent dari transkrip | f06-store-v2-sisanya |
| lp02-aktivitas-agent | Status agent live dari aliran sesi | f06-store-v2-sisanya, rb03b-free-flow |
| lp03-api-detail-run | API detail run dan detail agent | lp01-transkrip, lp02-aktivitas-agent |
| lp04-seed-demo | Data contoh berlabel dari run asli dan satu skenario tim fullstack (npm run seed) | f06-store-v2-sisanya, lp01-transkrip |
| lp05-ui-kerangka-proyek | Layar proyek (1/3): bar atas, kolom agent, rangka tiga kolom | lp04-seed-demo |
| lp06-ui-peta | Layar proyek (2/3): peta jalur, bangun dan audit dalam satu item | lp05-ui-kerangka-proyek |
| lp07-ui-chat | Layar proyek (3/3): panel Chat, kartu, dan tab Detail agent | lp05-ui-kerangka-proyek |
| lp12a-fe-proyek-data | Layar proyek: data live, bar atas, kolom agent, Jeda/Lanjut/Stop | lp05-ui-kerangka-proyek, lp03-api-detail-run, f17-fe-kerangka, lp07a-keputusan-screenshot |
| lp12b-fe-peta | Layar proyek: peta jalur dengan zoom, geser, pas layar (tanpa timeline) | lp06-ui-peta, lp12a-fe-proyek-data |
| lp12c-fe-detail-agent | Layar proyek: tab Detail agent dan lencana Chat | lp07-ui-chat, lp12a-fe-proyek-data |
| lp13-critic-proyek | Kritik layar proyek yang sudah tersambung data (peta, Chat, Detail agent) | lp12a-fe-proyek-data, lp12b-fe-peta, lp12c-fe-detail-agent, ch04-fe-chat, ch05-fe-izin |
| ch01-pesan-jawab | Pesan Chat dan jawaban: pertanyaan dan izin, jawaban pertama menang | f06-store-v2-sisanya, rb03b-free-flow |
| ch02-izin-aturan | Izin otomatis A3 dan aturan "Selalu setujui" per proyek | ch01-pesan-jawab |
| ch03-kirim-lanjutkan | Kirim pesan, lanjutkan run Selesai, tombol Lanjutkan | ch01-pesan-jawab, f14-ketat-resume |
| ch04-fe-chat | Chat: jawab pertanyaan, kotak ketik, baca saja | lp07-ui-chat, ch01-pesan-jawab, ch03-kirim-lanjutkan, lp12a-fe-proyek-data |
| ch05-fe-izin | Chat: kartu izin, serta tampilan Gagal/Terputus/Jeda limit dengan Lanjutkan | ch04-fe-chat, ch02-izin-aturan, lp12a-fe-proyek-data, ch03-kirim-lanjutkan, ll03-limit-jadwal |
| ll02-jeda-panjang | Jeda lebih dari 50 menit dan lanjut dari sesi terlepas | rb03b-free-flow, ch03-kirim-lanjutkan |
| ll03-limit-jadwal | Jeda limit: lanjut otomatis setelah reset, bertahan saat restart, pemulihan setelah restart | rb03b-free-flow, ch03-kirim-lanjutkan |
| pb01-api-proyek | API daftar proyek, detail proyek, pengaturan | f06-store-v2-sisanya, rb03a-conductor-inti, rb02-folder-proyek |
| pb03-fe-daftar | Daftar proyek: polling 3 detik dan aksi satu klik | rb05-ui-run-baru, pb01-api-proyek, ch03-kirim-lanjutkan, f17-fe-kerangka |
| hapus-web-lama | Hapus tampilan polos lama setelah rute React hidup | rb06-fe-run-baru, pb03-fe-daftar, lp12a-fe-proyek-data |
| nt01-fe-judul-bunyi | Judul tab dan bunyi untuk pertanyaan, izin, run gagal/terhenti, dan batas pemakaian (bisa dimatikan) | ch05-fe-izin, pb03-fe-daftar, f17-fe-kerangka |
| qa-fase1 | Uji Fase 1 sekali: Run baru, layar proyek, Chat, jeda limit, Daftar proyek, judul tab dan bunyi | rb06-fe-run-baru, lp12b-fe-peta, lp12c-fe-detail-agent, ch05-fe-izin, ll02-jeda-panjang, ll03-limit-jadwal, pb03-fe-daftar, nt01-fe-judul-bunyi, lp04-seed-demo, hapus-web-lama, lp13-critic-proyek |
| cyber-fase1 | Tinjauan keamanan dan kode Fase 1 sekali: mulai run, Harness, izin, Chat, penyimpanan, penyajian teks agent, jaringan Tailscale | rb04-api-mulai-run, rb02-folder-proyek, ch02-izin-aturan, ch03-kirim-lanjutkan, ll03-limit-jadwal, pb01-api-proyek, lp12c-fe-detail-agent, sc01-jaringan, hp05-dokumen-jalankan |
| hp05-dokumen-jalankan | Panduan menjalankan dan memasang (laptop, tailscale serve), tanpa tampilan HP | rb06-fe-run-baru, sc01-jaringan |
| lp07a-keputusan-screenshot | Pemilik menilai screenshot layar proyek dengan data contoh sebelum disambung ke data | lp06-ui-peta, lp07-ui-chat, lp04-seed-demo |

## Selesai

| ID | Judul | Bukti |
|---|---|---|
| f01-contract-pindah | Kontrak data dan Harness/Store dipindah ke folder modul tanpa mengubah perilaku (mekanis) | typecheck bersih; npm test 50 lulus 0 gagal; src/contract/, src/harness/, src/store/ ada, file lama hilang |
| f03-skema-kontrak | Skema kontrak Fase 1: umum, galat, tim, run, pesan, proyek, pengaturan, jeda limit | typecheck bersih; test/contract.test.ts 7 lulus; npm test 57 lulus 0 gagal |
| f04-vite-boilerplate | Kerangka aplikasi tampilan: Vite, React, alias kontrak, server melayani hasil build | build sukses; typecheck server+web bersih; 50 tes lulus; npm audit 0 vuln; web/vite.config.ts, web/src/main.tsx ada |
| f05-store-v2-inti | Penyimpanan v2 (1/2): proyek, run, sesi, milestone, batch, item | migrasi user_version 2 di src/store/migrations.ts; node --test store.test.ts lulus (33/33 gabungan store,teams,limits,web-lib) |
| f12-spike-asumsi | Cek asumsi T1 dan T2 dengan claude asli | docs/SPIKE.md bagian Cek T1/T2 (baris 112); test/fixtures/stream/subagent-background-haiku.jsonl; T1 dan T2 terbukti |
| f16-ui-kerangka | Kerangka halaman: rel navigasi, token desain, gaya dasar, tema terang/gelap | docs/bukti/f16-ui-kerangka/{terang,gelap}/audit-{1440,900}.png + audit.json (high/medium/low=0), NavRail + KOMPONEN.md ada, typecheck lulus |
| rb01-katalog-tim | Server membaca daftar agent dan perintah tim Fullstack dari plugin yang terpasang (agents/*.md) | src/teams/catalog.ts, fixture test/fixtures/teams {tiruan,rusak}; teams.test.ts lulus |
| lp10-fe-lib-run | Logika tampilan murni: status run, format, susunan Chat, status agent, tata letak peta | web/src/app/lib/{runState,format,agentStates,chatItems,railLayout}.ts; web-lib.test.ts lulus |
| ll01-parser-limit | Fixture dan pengenalan batas pemakaian serta jam reset | src/harness/limits.ts + 12 fixture test/fixtures/limits; limits.test.ts lulus |

## Ide / nanti (diparkir, belum dikerjakan)

- f08-kit-backlog-milestone: Skrip backlog: milestone, asal item, perbaikan - [Fase 2] Skrip: ~/.claude/skills/backlog/backlog.js (sinkronkan salinan di kit bila ada). Harus kompatibel dengan backlog lama.
- f07-kit-team-json: Kit Fullstack: crew/team.json dan agent backlog mengusulkan milestone - [Fase 2] Berkas: plugins/fullstack-dev/crew/team.json (di luar folder crew-control). Digabung dari: f09-kit-agent-backlog-milestone.
- f10-kit-run-crew: Kit Fullstack: /fullstack-dev:run mode --crew - [Fase 2] Berkas: plugins/fullstack-dev/commands/run.md.
- f11-kit-kontrak-bukti: Kit Fullstack: skill kontrak-bukti untuk semua agent - [Fase 2]
- bk01-port-backlog: Server membaca dan mengubah backlog proyek lewat skrip tim - [Fase 2]
- bk02-git-commit: Commit otomatis per batch dengan penolakan berkas rahasia - [Fase 2]
- bk03-flow-usulan: Lanjut backlog (1/3): usulan milestone dan persetujuan - [Fase 2]
- bk04-flow-batch: Lanjut backlog (2/3): batch, diff, commit, riwayat batch - [Fase 2]
- bk05-flow-henti: Lanjut backlog (3/3): aturan berhenti, keputusan pemilik, Siap review - [Fase 2]
- bk06-fe-milestone: Chat: usulan milestone, keputusan, riwayat batch, progres di bar atas - [Fase 2]
- rv01-bukti-scan: Server memindai bukti item dari kontrak bukti - [Fase 2]
- rv02-bukti-sajikan: Menyajikan berkas bukti dan aset mockup dengan aman - [Fase 2]
- rv03-api-review: API Review milestone: lihat, setujui, minta perbaikan - [Fase 2]
- rv04-ui-review: Layar Review milestone dan galeri bukti (bangun dan audit dalam satu item) - [Fase 2] Gabungan rv04 dan audit.
- rv05-fe-render-bukti: Render bukti aman: Mermaid, grafik, markdown, iframe sandbox - [Fase 2]
- rv06-fe-review: Review: Setujui, Minta perbaikan per item, Kirim perbaikan - [Fase 2]
- rv07-critic-review: Kritik layar Review milestone - [Fase 2]
- nt01-notifier: Pemicu pemberitahuan dan dedupe - [Fase 2] Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt02-webpush: Web Push: kunci VAPID, kirim, berlangganan - [Fase 2] Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt03-ui-pengaturan: Panel Pengaturan dan baris Aktifkan pemberitahuan - [Fase 2] Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt04-fe-pengaturan: Pengaturan tersambung: tema, bunyi, batch bawaan, judul tab, notifikasi desktop - [Fase 2] Digabung dari: nt06-fe-judul-bunyi. Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt05-fe-push-pwa: Push HP dan aplikasi terpasang (service worker, manifest) - [Fase 2] Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- hp01-ui-mobile: Tampilan HP (bangun dan audit dalam satu item) - [Fase 2] Gabungan hp01 dan audit.
- hp02-fe-mobile: HP tersambung: ganti tampilan di bawah 900 px, bilah tab, lembar folder - [Fase 2] Fase 2: ditunda pemilik 2026-11-05 (F11 HP versi ringkas).
- dk01-data-lengkap: Data fase 2 tetap lengkap: arsip run, bahan metrik Kesehatan kit, peristiwa pemberitahuan - [Fase 2] Pemilik 2026-11-05: layar F12/F9/F6/F11 ditunda ke fase 2 tetapi datanya harus tetap lengkap. Tanpa layar baru.
- dk02-qa-data-lengkap: Uji arsip: run lama bisa dibuka lengkap kelak dan tidak ada data yang hilang - [Fase 2] Pemilik 2026-11-05: layar F12/F9/F6/F11 ditunda ke fase 2 tetapi datanya harus tetap lengkap.
- qa-fase2: Uji Fase 2 sekali: batch, milestone, Review, kontrak bukti, push HP dan PWA - [Fase 2] Pengganti bk07, rv08, nt07, hp04.
- cyber-fase2: Tinjauan keamanan dan kode Fase 2 sekali: commit otomatis, CLI backlog, penyajian bukti, Web Push, jaringan (Tailscale, CSP, batas laju) - [Fase 2] Pengganti sc01, sc04, sc05, sc06-push-fase2.
- dd01-plugin-hook: Crew Control sebagai plugin dengan hook sesi desktop - [Fase 3]
- dd02-sesi-desktop: Sesi desktop tampil sebagai run berlabel dari desktop - [Fase 3]
- dd03-izin-desktop: Jawab izin sesi desktop dari dashboard dan Stop - [Fase 3] Menahan koneksi hook: konkurensi.
- dd04-fe-desktop: Tampilan sesi desktop: label dan hanya Stop - [Fase 3]
- rw01-api-riwayat: API Riwayat: daftar run, banding, hapus - [Fase 3] Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat).
- rw02-ui-riwayat: Layar Riwayat dan Banding (bangun dan audit dalam satu item) - [Fase 3] Gabungan rw02 dan audit.
- rw03-fe-riwayat: Riwayat tersambung: cari, buka run lama baca saja, banding, hapus - [Fase 3] Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat).
- kh01-metrik: Kesehatan kit: enam angka dan pembanding periode - [Fase 3] Perhitungan yang menentukan keputusan pemilik; model opus. Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- kh02-api-kesehatan: API Kesehatan kit: saringan, tabel item, telusur angka - [Fase 3] Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- kh03-ui-kesehatan: Layar Kesehatan kit (bangun dan audit dalam satu item) - [Fase 3] Gabungan kh03 dan audit.
- kh04-fe-kesehatan: Kesehatan kit tersambung: saringan URL dan telusur - [Fase 3] Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- qa-fase3: Uji Fase 3 sekali: sesi desktop, Riwayat, Kesehatan kit, tim sebagai data - [Fase 3] Pengganti dd05, rw05, kh06.
- dd07-uji-tangan-desktop: Uji tangan 2 menit sesi desktop, lalu putuskan mematikan Flow Viewer - [Fase 3] Keputusan pemilik 2026-11-04: ya, dilakukan setelah fitur dibangun. Digabung dari: dd06-matikan-flow-viewer.
- cyber-fase3: Tinjauan keamanan dan kode Fase 3 sekali: hook sesi desktop dan transkrip, API Riwayat dan Kesehatan - [Fase 3] Pengganti sc06-push.
- audit-akhir: Audit akhir keamanan dan kualitas kode - [Fase 3] Fase 1 dan 2 memakai satu cyber per fase; audit akhir hanya di ujung Fase 3.
- tl02-timeline: Layar proyek: tampilan timeline (batang agent paralel) dan tombol alih grafik/timeline - [Fase 2] Jawaban Q4 pemilik 2026-11-05: timeline masuk Fase 2. Perlu ui-designer bila tata letak baru.
- arsitektur-7a-spike: Perbarui ARCHITECTURE 7A dan T1 sesuai hasil spike (nama alat Agent, selesai lewat task_*, tutup sesi setelah tugas latar kosong) - asal: f12-spike-asumsi; harus selesai sebelum item Harness
- hapus-web-lama-catatan: Saat hapus web lama: ganti nama web/app.html jadi index.html, base Vite ke '/', prefix static dan index di src/server.ts - asal: f04-vite-boilerplate (penyimpangan disengaja: dilayani di /app/)
- kontrak-sisa-fase1: Skema kontrak tersisa: Config baru, RunDetail/AgentDetail/Batch/Milestone, event SSE activity/batch/milestone; ganti nama skema V2 ke nama final - asal: f03-skema-kontrak

## Ditolak

- tl01-timeline: Layar proyek: tampilan timeline (batang agent paralel) dan tombol alih grafik/timeline (Salah status saat impor (harus diparkir); diganti tl02-timeline)

