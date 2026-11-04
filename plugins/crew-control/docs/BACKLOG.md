# Backlog - Crew Control

Diperbarui otomatis oleh backlog.js. Jangan edit tangan; ubah lewat perintah atau agent backlog.

**Progres: 0/87 selesai** · berjalan 0 · siap 2 · menunggu 85 · gagal 0

## Siap dikerjakan

| ID | Jenis | Judul | Agent | Nilai/Usaha |
|---|---|---|---|---|
| f01-contract-pindah | be | Kontrak data dan Harness/Store dipindah ke folder modul tanpa mengubah perilaku (mekanis) | be | high/m |
| f08-kit-backlog-milestone | be | Skrip backlog: milestone, asal item, perbaikan | be | high/m |

## Menunggu dependensi

| ID | Judul | Menunggu |
|---|---|---|
| f03a-skema-kontrak-inti | Skema kontrak: umum, galat, tim, bukti, run, pesan | f01-contract-pindah |
| f03b-skema-kontrak-sisanya | Skema kontrak: proyek, review, kesehatan kit, push, hook | f03a-skema-kontrak-inti |
| f04-vite-boilerplate | Kerangka aplikasi tampilan: Vite, React, alias kontrak, server melayani hasil build | f01-contract-pindah |
| f05-store-v2-inti | Penyimpanan v2 (1/2): proyek, run, sesi, milestone, batch, item | f01-contract-pindah, f03a-skema-kontrak-inti |
| f06-store-v2-sisanya | Penyimpanan v2 (2/2): bukti, pesan, aktivitas agent, aturan izin, push, notifikasi, pengaturan | f05-store-v2-inti |
| f07-kit-team-json | Kit Fullstack: crew/team.json dan agent backlog mengusulkan milestone | f03a-skema-kontrak-inti, f08-kit-backlog-milestone |
| f10-kit-run-crew | Kit Fullstack: /fullstack-dev:run mode --crew | f08-kit-backlog-milestone |
| f11-kit-kontrak-bukti | Kit Fullstack: skill kontrak-bukti untuk semua agent | f03a-skema-kontrak-inti |
| f12-spike-asumsi | Cek asumsi T1 dan T2 dengan claude asli | f01-contract-pindah |
| f14-ketat-resume | Pengetatan: ketik-lanjut hanya untuk run terakhir Selesai; restart tidak mengubah run tanpa sesi | f05-store-v2-inti |
| f16-ui-kerangka | Kerangka halaman: rel navigasi, token desain, gaya dasar, tema terang/gelap | f04-vite-boilerplate |
| f17-fe-kerangka | Kerangka aplikasi: rute, klien API, tema | f04-vite-boilerplate, f16-ui-kerangka, f03a-skema-kontrak-inti |
| f18-critic-kerangka | Kritik kerangka halaman dan rel navigasi | f16-ui-kerangka |
| sc01-jaringan | Keamanan jaringan: pengguna Tailscale, CSP, batas laju | f04-vite-boilerplate, f03b-skema-kontrak-sisanya |
| rb01-katalog-tim | Server membaca definisi tim dan menawarkan perintahnya | f03a-skema-kontrak-inti, f01-contract-pindah, f07-kit-team-json |
| rb02-folder-proyek | Jelajah dan buat folder proyek di bawah folder kerja | f05-store-v2-inti, f03b-skema-kontrak-sisanya |
| rb03a-conductor-inti | Pengatur run: mesin status, satu run aktif per proyek, kapasitas | f01-contract-pindah, f05-store-v2-inti, f14-ketat-resume, f12-spike-asumsi, rb01-katalog-tim |
| rb03b-free-flow | Run prompt bebas dan perintah sesi (FreeFlow) | rb03a-conductor-inti |
| rb04-api-mulai-run | Mulai run lewat API dengan model dan perintah dari tim | rb03b-free-flow, rb02-folder-proyek |
| rb05-ui-run-baru | Layar Run baru: kotak ketik, chip perintah, pilih model dan folder | f16-ui-kerangka |
| rb05-ui-run-baru-audit | Layar Run baru: audit dan perbaikan | rb05-ui-run-baru |
| rb06-fe-run-baru | Menyambung Run baru: ingat folder dan model, Enter untuk mulai | rb05-ui-run-baru-audit, rb04-api-mulai-run, rb02-folder-proyek, f17-fe-kerangka |
| rb07-critic-run-baru | Kritik layar Run baru dan Daftar proyek | rb05-ui-run-baru-audit, pb02-ui-daftar |
| rb08-qa-run-baru | Uji Run baru dan mulai run (F1, F2) | rb06-fe-run-baru, rb04-api-mulai-run, rb01-katalog-tim |
| sc02-mulai-run | Tinjauan keamanan dan kode: mulai run, Harness, izin, layar proyek | rb01-katalog-tim, rb04-api-mulai-run, lp12a-fe-proyek-data, lp12b-fe-peta, lp12c-fe-detail-agent, ch02-izin-aturan, ch03-kirim-lanjutkan |
| lp01-transkrip | Token dan model per pemanggilan agent dari transkrip | f06-store-v2-sisanya |
| lp02-aktivitas-agent | Status agent live dari aliran sesi | f12-spike-asumsi, f06-store-v2-sisanya, rb03b-free-flow |
| lp03-api-detail-run | API detail run dan detail agent | lp01-transkrip, lp02-aktivitas-agent, rb01-katalog-tim |
| lp04-seed-demo | Data contoh berlabel untuk desain dan uji (npm run seed) | lp03-api-detail-run |
| lp05-ui-kerangka-proyek | Layar proyek (1/3): bar atas, kolom agent, rangka tiga kolom | f16-ui-kerangka |
| lp06-ui-peta | Layar proyek (2/3): peta jalur dan timeline | lp05-ui-kerangka-proyek |
| lp06-ui-peta-audit | Layar proyek (2/3): audit dan perbaikan peta | lp06-ui-peta |
| lp07-ui-chat | Layar proyek (3/3): panel Chat dan kartu | lp05-ui-kerangka-proyek |
| lp08-ui-detail-agent | Panel Detail agent | lp05-ui-kerangka-proyek |
| lp10-fe-lib-run | Logika tampilan murni: status run, format, susunan Chat | f04-vite-boilerplate, f03a-skema-kontrak-inti |
| lp11-fe-lib-peta | Logika tampilan murni: status agent dan tata letak peta | f04-vite-boilerplate, f03a-skema-kontrak-inti |
| lp12a-fe-proyek-data | Layar proyek: data live, bar atas, kolom agent, Jeda/Lanjut/Stop | lp05-ui-kerangka-proyek, lp10-fe-lib-run, lp11-fe-lib-peta, lp03-api-detail-run, f17-fe-kerangka |
| lp12b-fe-peta | Layar proyek: peta jalur dengan zoom/geser/pas layar dan timeline | lp06-ui-peta-audit, lp12a-fe-proyek-data |
| lp12c-fe-detail-agent | Layar proyek: tab Detail agent dan lencana Chat | lp08-ui-detail-agent, lp12a-fe-proyek-data |
| lp13-critic-proyek | Kritik layar proyek (peta, Chat, Detail) | lp06-ui-peta-audit, lp07-ui-chat, lp08-ui-detail-agent |
| lp14-qa-proyek | Uji layar proyek tiga kolom (F4) | lp12a-fe-proyek-data, lp12b-fe-peta, lp12c-fe-detail-agent, lp04-seed-demo |
| ch01-pesan-jawab | Pesan Chat dan jawaban: pertanyaan dan izin, jawaban pertama menang | f06-store-v2-sisanya, rb03b-free-flow |
| ch02-izin-aturan | Izin otomatis A3 dan aturan "Selalu setujui" per proyek | ch01-pesan-jawab |
| ch03-kirim-lanjutkan | Kirim pesan, lanjutkan run Selesai, tombol Lanjutkan | ch01-pesan-jawab, f14-ketat-resume |
| ch04-fe-chat | Chat: jawab pertanyaan, kotak ketik, baca saja | lp07-ui-chat, ch01-pesan-jawab, ch03-kirim-lanjutkan, lp12a-fe-proyek-data |
| ch05-fe-izin | Chat: kartu izin, serta tampilan Gagal/Terputus/Jeda limit dengan Lanjutkan | ch04-fe-chat, ch02-izin-aturan, lp12a-fe-proyek-data, ch03-kirim-lanjutkan, ll03-limit-jadwal |
| ch06-qa-chat | Uji Chat (F5) | ch04-fe-chat, ch05-fe-izin, ch03-kirim-lanjutkan |
| ll01-parser-limit | Fixture dan pengenalan batas pemakaian serta jam reset | f01-contract-pindah |
| ll02-jeda-panjang | Jeda lebih dari 50 menit dan lanjut dari sesi terlepas | rb03b-free-flow, ch03-kirim-lanjutkan |
| ll03-limit-jadwal | Jeda limit: lanjut otomatis setelah reset, bertahan saat restart | ll01-parser-limit, rb03b-free-flow |
| ll04-pulih-restart | Pemulihan setelah restart dan Lanjutkan sesi baru | ll03-limit-jadwal, ch03-kirim-lanjutkan |
| ll06-qa-jeda-limit | Uji Stop, Jeda, Terputus, dan batas pemakaian | ll02-jeda-panjang, ll04-pulih-restart, ch05-fe-izin |
| bk01-port-backlog | Server membaca dan mengubah backlog proyek lewat skrip tim | f08-kit-backlog-milestone, f05-store-v2-inti, rb01-katalog-tim |
| bk02-git-commit | Commit otomatis per batch dengan penolakan berkas rahasia | f01-contract-pindah |
| bk03-flow-usulan | Lanjut backlog (1/3): usulan milestone dan persetujuan | bk01-port-backlog, rb03a-conductor-inti, ch01-pesan-jawab |
| bk04-flow-batch | Lanjut backlog (2/3): batch, diff, commit, riwayat batch | bk03-flow-usulan, bk02-git-commit, f10-kit-run-crew, ll03-limit-jadwal |
| bk05-flow-henti | Lanjut backlog (3/3): aturan berhenti, keputusan pemilik, Siap review | bk04-flow-batch |
| bk06-fe-milestone | Chat: usulan milestone, keputusan, riwayat batch, progres di bar atas | lp07-ui-chat, bk03-flow-usulan, bk05-flow-henti, ch04-fe-chat |
| bk07-qa-backlog | Uji batch dan milestone (F3) | bk05-flow-henti, bk06-fe-milestone, rb06-fe-run-baru |
| sc04-commit-backlog | Tinjauan keamanan dan kode: commit otomatis, CLI backlog, pengatur run | bk02-git-commit, bk05-flow-henti, ll02-jeda-panjang, lp02-aktivitas-agent |
| rv01-bukti-scan | Server memindai bukti item dari kontrak bukti | f06-store-v2-sisanya, f11-kit-kontrak-bukti |
| rv02-bukti-sajikan | Menyajikan berkas bukti dan aset mockup dengan aman | rv01-bukti-scan |
| rv03-api-review | API Review milestone: lihat, setujui, minta perbaikan | rv01-bukti-scan, bk05-flow-henti, bk01-port-backlog |
| rv04-ui-review | Layar Review milestone dan galeri bukti | f16-ui-kerangka |
| rv04-ui-review-audit | Layar Review: audit dan perbaikan | rv04-ui-review |
| rv05-fe-render-bukti | Render bukti aman: Mermaid, grafik, markdown, iframe sandbox | rv04-ui-review-audit, rv02-bukti-sajikan |
| rv06-fe-review | Review: Setujui, Minta perbaikan per item, Kirim perbaikan | rv04-ui-review-audit, rv03-api-review, rv05-fe-render-bukti, f17-fe-kerangka |
| rv07-critic-review | Kritik layar Review milestone | rv04-ui-review-audit |
| rv08-qa-review | Uji Review dan kontrak bukti (F7, F8) | rv06-fe-review, rv03-api-review, rv02-bukti-sajikan |
| sc05-bukti-render | Tinjauan keamanan dan kode: penyajian bukti, render teks agent, API Review | rv02-bukti-sajikan, rv05-fe-render-bukti, rv03-api-review |
| pb01-api-proyek | API daftar proyek, detail proyek, pengaturan | f06-store-v2-sisanya, rb03a-conductor-inti, rb02-folder-proyek |
| pb02-ui-daftar | Layar Daftar proyek | f16-ui-kerangka |
| pb03-fe-daftar | Daftar proyek: polling 3 detik dan aksi satu klik | pb02-ui-daftar, pb01-api-proyek, ch03-kirim-lanjutkan, f17-fe-kerangka |
| pb05-qa-daftar | Uji Daftar proyek | pb03-fe-daftar, lp04-seed-demo |
| hapus-web-lama | Hapus tampilan polos lama setelah rute React hidup | rb06-fe-run-baru, pb03-fe-daftar, lp12a-fe-proyek-data |
| sc06-push | Tinjauan keamanan: hook sesi desktop dan transkrip | dd03-izin-desktop, lp01-transkrip |
| dd01-plugin-hook | Crew Control sebagai plugin dengan hook sesi desktop | f03b-skema-kontrak-sisanya |
| dd02-sesi-desktop | Sesi desktop tampil sebagai run berlabel dari desktop | dd01-plugin-hook, lp01-transkrip, rb03a-conductor-inti, f12-spike-asumsi |
| dd03-izin-desktop | Jawab izin sesi desktop dari dashboard dan Stop | dd02-sesi-desktop, ch01-pesan-jawab |
| dd04-fe-desktop | Tampilan sesi desktop: label dan hanya Stop | dd03-izin-desktop, lp12a-fe-proyek-data, ch04-fe-chat |
| dd05-qa-desktop | Uji sesi desktop dengan simulasi hook (F10) | dd04-fe-desktop, dd03-izin-desktop |
| dd07-uji-tangan-desktop | Uji tangan 2 menit sesi desktop, lalu putuskan mematikan Flow Viewer | dd05-qa-desktop, dd04-fe-desktop |
| audit-akhir | Audit akhir keamanan dan kualitas kode | f01-contract-pindah, f03a-skema-kontrak-inti, f03b-skema-kontrak-sisanya, f04-vite-boilerplate, f05-store-v2-inti, f06-store-v2-sisanya, f07-kit-team-json, f08-kit-backlog-milestone, f10-kit-run-crew, f11-kit-kontrak-bukti, f12-spike-asumsi, ll01-parser-limit, f14-ketat-resume, f16-ui-kerangka, f17-fe-kerangka, f18-critic-kerangka, sc01-jaringan, rb01-katalog-tim, rb02-folder-proyek, rb03a-conductor-inti, rb03b-free-flow, rb04-api-mulai-run, rb05-ui-run-baru, rb05-ui-run-baru-audit, rb06-fe-run-baru, rb07-critic-run-baru, rb08-qa-run-baru, sc02-mulai-run, lp01-transkrip, lp02-aktivitas-agent, lp03-api-detail-run, lp04-seed-demo, lp05-ui-kerangka-proyek, lp06-ui-peta, lp06-ui-peta-audit, lp07-ui-chat, lp08-ui-detail-agent, lp10-fe-lib-run, lp11-fe-lib-peta, lp12a-fe-proyek-data, lp12b-fe-peta, lp12c-fe-detail-agent, lp13-critic-proyek, lp14-qa-proyek, ch01-pesan-jawab, ch02-izin-aturan, ch03-kirim-lanjutkan, ch04-fe-chat, ch05-fe-izin, ch06-qa-chat, ll02-jeda-panjang, ll03-limit-jadwal, ll04-pulih-restart, ll06-qa-jeda-limit, bk01-port-backlog, bk02-git-commit, bk03-flow-usulan, bk04-flow-batch, bk05-flow-henti, bk06-fe-milestone, bk07-qa-backlog, sc04-commit-backlog, rv01-bukti-scan, rv02-bukti-sajikan, rv03-api-review, rv04-ui-review, rv04-ui-review-audit, rv05-fe-render-bukti, rv06-fe-review, rv07-critic-review, rv08-qa-review, sc05-bukti-render, pb01-api-proyek, pb02-ui-daftar, pb03-fe-daftar, pb05-qa-daftar, hapus-web-lama, sc06-push, dd01-plugin-hook, dd02-sesi-desktop, dd03-izin-desktop, dd04-fe-desktop, dd05-qa-desktop, dd07-uji-tangan-desktop, dk01-data-lengkap, dk02-qa-data-lengkap |
| dk01-data-lengkap | Data fase 2 tetap lengkap: arsip run, bahan metrik Kesehatan kit, peristiwa pemberitahuan | lp01-transkrip, lp02-aktivitas-agent, ch01-pesan-jawab, ch03-kirim-lanjutkan, bk05-flow-henti, rv01-bukti-scan, ll03-limit-jadwal |
| dk02-qa-data-lengkap | Uji arsip: run lama bisa dibuka lengkap kelak dan tidak ada data yang hilang | dk01-data-lengkap, ll04-pulih-restart, dd03-izin-desktop |

## Ide / nanti (diparkir, belum dikerjakan)

- nt01-notifier: Pemicu pemberitahuan dan dedupe - Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt02-webpush: Web Push: kunci VAPID, kirim, berlangganan - Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt03-ui-pengaturan: Panel Pengaturan dan baris Aktifkan pemberitahuan - Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt04-fe-pengaturan: Pengaturan tersambung: tema, bunyi, batch bawaan, judul tab, notifikasi desktop - Digabung dari: nt06-fe-judul-bunyi. Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt05-fe-push-pwa: Push HP dan aplikasi terpasang (service worker, manifest) - Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- nt07-qa-notifikasi: Uji pemberitahuan (F6) - Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- hp01-ui-mobile: Tampilan HP: bilah tab, Chat ringkas, lembar bawah, status agent singkat - Bagian: bangun. Tata letak sempit; rancangan HP 375 ada di DESIGN. Fase 2: ditunda pemilik 2026-11-05 (F11 HP versi ringkas).
- hp01-ui-mobile-audit: Tampilan HP: audit dan perbaikan - Bagian: audit Fase 2: ditunda pemilik 2026-11-05 (F11 HP versi ringkas).
- hp02-fe-mobile: HP tersambung: ganti tampilan di bawah 900 px, bilah tab, lembar folder - Fase 2: ditunda pemilik 2026-11-05 (F11 HP versi ringkas).
- hp03-critic-hp: Kritik tampilan HP - Fase 2: ditunda pemilik 2026-11-05 (F11 HP versi ringkas).
- hp04-qa-hp: Uji HP dan pemasangan sebagai aplikasi (F11) - Fase 2: ditunda pemilik 2026-11-05 (F11 HP versi ringkas).
- hp05-dokumen-jalankan: Panduan menjalankan dan memasang (laptop, Tailscale, HP) - Fase 2: ditunda pemilik 2026-11-05 (F11 HP versi ringkas).
- sc06-push-fase2: Tinjauan keamanan: Web Push dan rahasia VAPID - Cakupan [SEC]: panggilan keluar (SSRF), rahasia. Fase 2: ditunda pemilik 2026-11-05 (F6 Pemberitahuan).
- rw01-api-riwayat: API Riwayat: daftar run, banding, hapus - Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat).
- rw02-ui-riwayat: Layar Riwayat dan Banding dua run - Bagian: bangun. Layar baru, belum ada mockup. Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat).
- rw02-ui-riwayat-audit: Layar Riwayat: audit dan perbaikan - Bagian: audit Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat).
- rw03-fe-riwayat: Riwayat tersambung: cari, buka run lama baca saja, banding, hapus - Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat).
- rw05-qa-riwayat: Uji Riwayat (F12) - Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat).
- kh01-metrik: Kesehatan kit: enam angka dan pembanding periode - Perhitungan yang menentukan keputusan pemilik; model opus. Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- kh02-api-kesehatan: API Kesehatan kit: saringan, tabel item, telusur angka - Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- kh03-ui-kesehatan: Layar Kesehatan kit - Bagian: bangun. Layar dashboard baru, belum ada mockup. Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- kh03-ui-kesehatan-audit: Layar Kesehatan kit: audit dan perbaikan - Bagian: audit Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- kh04-fe-kesehatan: Kesehatan kit tersambung: saringan URL dan telusur - Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- kh06-qa-kesehatan: Uji Kesehatan kit (F9) - Fase 2: ditunda pemilik 2026-11-05 (F9 Kesehatan kit).
- rw04-critic-riwayat: Kritik layar Riwayat dan Kesehatan kit - Digabung dari: kh05-critic-kesehatan. Fase 2: ditunda pemilik 2026-11-05 (F12 Riwayat). (gabungan kritik Riwayat dan Kesehatan kit)

