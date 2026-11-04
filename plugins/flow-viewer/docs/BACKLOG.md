# Backlog - Flow Viewer v2

Diperbarui otomatis oleh backlog.js. Jangan edit tangan; ubah lewat perintah atau agent backlog.

**Progres: 30/105 selesai** · berjalan 0 · siap 4 · menunggu 71 · gagal 0

## Siap dikerjakan

| ID | Jenis | Judul | Agent | Nilai/Usaha |
|---|---|---|---|---|
| t09b-snapshot-proyek | be | Snapshot ditambah proyek, progres, token pembanding, pemberitahuan | be | high/m |
| t13b-rute-app | fe | Rute halaman: daftar proyek, tampilan proyek, Riwayat, buka otomatis bila satu proyek | fe | high/s |
| t14a-dom-format | fe | Dasar tampilan aman: dom.js (escape otomatis), format, ikon | fe | high/s |
| t15a-tokens-tema | ui | Token desain Gading: huruf, warna, bayangan, dua tema | ui-designer | high/m |

## Menunggu dependensi

| ID | Judul | Menunggu |
|---|---|---|
| t10b-server-endpoint | Server melayani banyak proyek: /projects, ?p=, stream lama, batas koneksi | t09b-snapshot-proyek |
| t11-uji-http | Uji HTTP: proyek terisolasi, alamat lama, serangan umum | t10b-server-endpoint |
| t12-replay-nyata | Replay event nyata (73 Stop) sebelum layar dibangun | t10b-server-endpoint |
| k-ambang-selesai | Seberapa ketat tanda "Selesai" setelah hasil replay nyata | t12-replay-nyata |
| sec-server-hardening | Cyber: hardening server (Host/Origin, CSP, path traversal, batas ukuran) | t11-uji-http, t10b-server-endpoint |
| review-kode-server | Cyber: review kode kelompok server (run, projects, attention, server) | t10b-server-endpoint, t09b-snapshot-proyek |
| t14b-api-sse | Klien data live: SSE, sambung ulang, bilah terputus dengan jam pembaruan | t14a-dom-format |
| t15b-komponen-dasar | Komponen dasar: bilah atas, pita, kotak, panel, rel, node, tab | t15a-tokens-tema |
| t16a-graph-layout | Grafik workflow live: layout node, konektor, crew bawaan | t14a-dom-format, t15b-komponen-dasar, t10b-server-endpoint, t12-replay-nyata |
| t16b-graph-zoom | Zoom, pan, pas layar, seleksi, dan keyboard pada grafik | t16a-graph-layout |
| t16c-live-tinggi-laptop | Tampilan Live muat di layar laptop nyata (tinggi pendek) | t16b-graph-zoom |
| t17-indikator | Tiga indikator besar: siapa kerja, progres, token (menempel) | t16b-graph-zoom, t14b-api-sse |
| t18a-panel-rel-percakapan-backlog | Panel samping dan rel (enam kunci) + tab Percakapan | t16b-graph-zoom, t14b-api-sse |
| t19a-detail-mode | Detail agent di panel: satu kolom, status lipat disimpan, Esc tidak menggeser grafik | t18a-panel-rel-percakapan-backlog |
| t24-tema-menu-lainnya | Tema dan menu Lainnya (Reset run dua langkah); Laporan teks dihapus | t17-indikator |
| t20a-kotak-pemberitahuan | Kotak Butuh input dan Gagal di Live, lengkap dengan pilihan jawaban | t17-indikator, t12-replay-nyata |
| t20b-notifikasi-bunyi | Judul tab berkedip, bunyi, dan notifikasi desktop | t20a-kotak-pemberitahuan, k-ambang-selesai |
| t21-ringkasan-run | Ringkasan run otomatis dan lewat tombol "Ringkasan" | t20a-kotak-pemberitahuan |
| critic-live-r1 | Kritik tampilan Live nyata (putaran 1) | t16c-live-tinggi-laptop, t17-indikator, t18a-panel-rel-percakapan-backlog, t19a-detail-mode, t24-tema-menu-lainnya |
| fix-live | Perbaiki temuan wajib kritikus Live | critic-live-r1 |
| critic-live-r2 | Kritik tampilan Live nyata (putaran 2, terakhir) | fix-live |
| critic-notif-r1 | Kritik kotak pemberitahuan dan Ringkasan run nyata (putaran 1) | t20a-kotak-pemberitahuan, t20b-notifikasi-bunyi, t21-ringkasan-run |
| fix-notif | Perbaiki temuan wajib kritikus pemberitahuan dan Ringkasan | critic-notif-r1 |
| critic-notif-r2 | Kritik kotak pemberitahuan dan Ringkasan (putaran 2, terakhir) | fix-notif |
| qa-a-fixture-feed | Uji UI: fixture feed.js dan skrip tes lama dipindah ke test/ui/ | critic-live-r2, critic-notif-r2 |
| qa-a-acceptance | Uji penerimaan layar Live: F2, F3, F4, F5, F6, F7 + tinggi laptop | qa-a-fixture-feed |
| review-kode-klien | Cyber: review kode klien Tahap A (graph, panel, alerts, notify, summary) | t16b-graph-zoom, t18a-panel-rel-percakapan-backlog, t19a-detail-mode, t20b-notifikasi-bunyi, t21-ringkasan-run, t33b-laporan-fe, t34b-backlog-fe, t19b-detail-lengkap |
| ui-b-daftar-proyek | Desain Daftar proyek (/), keadaan kosong, memuat, terputus | critic-live-r2, critic-notif-r2 |
| ui-b-riwayat-runlama | Desain Riwayat selebar layar (6 kolom, selisih + Boros) dan run lama (bangun) | critic-live-r2, critic-notif-r2 |
| ui-b-tab-data | Desain tab File (diff), Skill, dan state lengkap Percakapan/Backlog | critic-live-r2, critic-notif-r2 |
| ui-b-tab-token-log | Desain tab Token (tabel per agent) dan Log (linimasa) | critic-live-r2, critic-notif-r2 |
| ui-b-detail-state | Desain detail agent satu kolom: jawaban di atas, bagian berlipat (bangun) | critic-live-r2, critic-notif-r2 |
| ui-b-state-global | Desain state global: kosong, memuat, terputus, tanpa flow, notifikasi diblokir | critic-live-r2, critic-notif-r2 |
| ui-b-sempit | Desain tampilan di bawah 900 px: daftar kartu agent dan lapisan panel | critic-live-r2, critic-notif-r2 |
| t22-daftar-proyek | Bangun Daftar proyek, pengalih proyek, judul tab | ui-b-daftar-proyek, t14b-api-sse, t13b-rute-app, t10b-server-endpoint |
| t23a-riwayat | Bangun Riwayat selebar layar: tabel 6 kolom, selisih + Boros, tren, banding, hapus | ui-b-riwayat-runlama-audit, t21-ringkasan-run, t10b-server-endpoint |
| t23b-run-lama | Bangun tampilan run lama (hanya baca) | t23a-riwayat, t19a-detail-mode |
| t18b-tab-file-skill-state | Bangun tab File (diff di tempat), Skill, dan state lengkap Percakapan/Backlog | ui-b-tab-data, t18a-panel-rel-percakapan-backlog |
| t18c-tab-token-log | Bangun tab Token (tabel per agent) dan Log (linimasa) | ui-b-tab-token-log, t18a-panel-rel-percakapan-backlog |
| t19b-detail-lengkap | Bangun isi detail agent: kepala, peringatan, jawaban, tiga angka, delapan bagian berlipat | ui-b-detail-state-audit, t19a-detail-mode |
| t25a-state-global | Bangun state global: kosong, memuat, terputus, tanpa flow, notifikasi diblokir | ui-b-state-global, t14b-api-sse, t20b-notifikasi-bunyi |
| t25b-agent-luar-flow | Bangun penandaan agent di luar flow | ui-b-detail-state-audit, t16a-graph-layout |
| t25c-sempit | Bangun tampilan di bawah 900 px | ui-b-sempit, t18a-panel-rel-percakapan-backlog, t19a-detail-mode, t16b-graph-zoom |
| critic-b1-r1 | Kritik Daftar proyek, Riwayat, dan run lama (putaran 1) | t22-daftar-proyek, t23a-riwayat, t23b-run-lama |
| fix-b1 | Perbaiki temuan wajib kritikus: proyek, Riwayat, run lama | critic-b1-r1 |
| critic-b1-r2 | Kritik Daftar proyek, Riwayat, run lama (putaran 2, terakhir) | fix-b1 |
| critic-b2-r1 | Kritik tab data, detail node, state, di luar flow, < 900 px (putaran 1) | t18b-tab-file-skill-state, t18c-tab-token-log, t19b-detail-lengkap, t25a-state-global, t25b-agent-luar-flow, t25c-sempit |
| fix-b2 | Perbaiki temuan wajib kritikus: tab data, detail, state, sempit | critic-b2-r1 |
| critic-b2-r2 | Kritik tab data, detail, state, sempit (putaran 2, terakhir) | fix-b2 |
| qa-b-acceptance | Uji penerimaan Tahap B: F1, F8, F9, state, < 900 px; skrip lama semua jalan | critic-b1-r2, critic-b2-r2, qa-a-acceptance, critic-b3-r2, qa-laporan-token, qa-backlog-bagian, qa-detail-satu-kolom |
| qa-audit-visual | Audit visual ui-craft 900/1440 terang/gelap dan ukuran teks node | qa-b-acceptance |
| qa-perf | Uji beban: 3 proyek x 12 agent x 30 event/dtk selama 60 dtk | qa-a-fixture-feed, t10b-server-endpoint |
| sec-klien-xss | Cyber: keamanan klien akhir (XSS, CSP, judul tab, notifikasi) | qa-b-acceptance, t14a-dom-format, sec-server-hardening |
| t30-rilis | Rilis v2.0.0: README, versi, status proyek | t11-uji-http, qa-b-acceptance, qa-audit-visual, qa-perf, sec-klien-xss, review-kode-server, review-kode-klien |
| audit-akhir | Cyber: audit akhir seluruh kode v2 | t30-rilis, qa-b-acceptance, fix-teks-butuh-input |
| k-terima-rilis | Pemilik menerima v2.0.0 setelah mencoba dengan pekerjaan nyata | audit-akhir |
| fix-teks-butuh-input | Samakan teks "butuh jawabanmu" dengan istilah Butuh input (UX §10) di tampilan dan uji | t20a-kotak-pemberitahuan, t18a-panel-rel-percakapan-backlog |
| ui-b-detail-state-audit | Audit desain detail agent satu kolom (ui-craft, antislop, kontras) | ui-b-detail-state |
| qa-detail-satu-kolom | Uji detail agent satu kolom: T4 (2 langkah lalu 1) dan T9 (alasan gagal 1 klik) | t19b-detail-lengkap |
| ui-b-riwayat-runlama-audit | Audit desain Riwayat selebar layar dan run lama | ui-b-riwayat-runlama |
| ui-b-laporan-token | Desain Laporan token proyek di atas Riwayat (bangun) | critic-live-r2, critic-notif-r2 |
| ui-b-laporan-token-audit | Audit desain Laporan token proyek | ui-b-laporan-token |
| t33b-laporan-fe | Bangun Laporan token di atas Riwayat: tombol per proyek, state, tutup tanpa kehilangan posisi | ui-b-laporan-token-audit, t23a-riwayat |
| qa-laporan-token | Uji penerimaan Laporan token (F12) | t33b-laporan-fe |
| ui-b-backlog-bagian | Desain panel Backlog per bagian (bangun) | critic-live-r2, critic-notif-r2 |
| ui-b-backlog-bagian-audit | Audit desain panel Backlog per bagian | ui-b-backlog-bagian |
| t34b-backlog-fe | Bangun panel Backlog per bagian (menggantikan daftar datar per jenis) | ui-b-backlog-bagian-audit, t18a-panel-rel-percakapan-backlog |
| qa-backlog-bagian | Uji penerimaan Backlog per bagian (F11) | t34b-backlog-fe |
| critic-b3-r1 | Review ui-critic: Riwayat selebar layar, Laporan token, Backlog per bagian | t23a-riwayat, t33b-laporan-fe, t34b-backlog-fe |
| fix-b3 | Tutup temuan wajib review Riwayat, Laporan token, Backlog | critic-b3-r1 |
| critic-b3-r2 | Review ulang ui-critic: Riwayat, Laporan token, Backlog | fix-b3 |

## Selesai

| ID | Judul | Bukti |
|---|---|---|
| k-run-baru-per-prompt | Prompt baru setelah run selesai dihitung sebagai run baru | Keputusan pemilik: ya (rekomendasi), disetujui pemilik 2026-10-27 |
| k-riwayat-200 | Riwayat menyimpan 200 run per proyek | Keputusan pemilik: ya (rekomendasi), disetujui pemilik 2026-10-27 |
| k-butuh-input-tengah-flow | Claude berhenti dengan pertanyaan atau di tengah flow = Butuh input, bukan Selesai | Keputusan pemilik: ya (rekomendasi), disetujui pemilik 2026-10-27 |
| t01-fondasi | Siapkan fondasi plugin: build-id, .gitignore, folder uji | node --test: 1 pass 0 fail; .gitignore + server/build-id.js ada; data dalam repo tidak tampil di git status (diperiksa orkestrator) |
| t02-agents | Server mengenali agent dari folder agent dan flows.json (bukan kode) | node --test test/unit/agents.test.js: 6 pass; seluruh suite unit 30/30 lulus (diperiksa orkestrator); flows.json valid; server/agents.js baru, belum tersambung ke server.js |
| t03-usage | Server membaca token dari transkrip secara inkremental dan aman | node --test test/unit/usage.test.js: 4 pass 0 fail (diperiksa orkestrator); server/usage.js baru; penyambungan ke server.js belum, dicatat untuk item wiring |
| t04-backlog-ringkas | Server meringkas backlog proyek (persen berbobot, item keputusan) | node --test test/unit/backlog-summary.test.js: 8 pass 0 fail (diperiksa orkestrator); pct berbobot 45% sama hitungan manual fixture; server/backlog-summary.js baru, belum tersambung; catatan: perintah suite unit pakai glob node --test "test/unit/*.test.js" (ARCHITECTURE s11 perlu diperbarui) |
| t05a-run-pabrik | Pindahkan state run ke pabrik per run (tanpa variabel global) | node --test: 41 lulus 0 gagal (4 tes baru run.test.js); server/run.js ada. Catatan: feed.js lama tidak ada di repo, fixture ditulis ulang sebagai urutan event |
| t05b-run-detail-percakapan | Pindahkan detail, percakapan, dan laporan lama ke run.js | node --test: 43 lulus 0 gagal; pending jadi daftar per pengirim di run.js |
| t06a-fase-run | Aturan fase run: berjalan, jeda, selesai, run baru per prompt | node --test: 52 lulus 0 gagal; node --check server.js bersih; fase running/paused/finished dengan jam palsu. Belum diuji: HTTP/SSE, replay T12 |
| t06b-gagal-ringkasan | Aturan gagal dan data Ringkasan run | node --test: 58 lulus 0 gagal (6 tes baru); status Gagal dan summary di run.js |
| t07-attention | Server menghitung item pemberitahuan (pertanyaan, izin, keputusan, gagal, selesai) | node --test test/unit/attention.test.js: 9 lulus, 0 gagal; server/attention.js ada |
| t08-store | Riwayat tersimpan per proyek, 200 run per proyek | store.test.js pass, SQLite dan JSON: A 201->200, B utuh, hapus run berjalan ditolak; 16/16 lulus di 3 file tes |
| t09a-projects-kunci | Server memisahkan proyek: kunci, ikatan sesi, aktif 6 jam | node --test test/unit/projects.test.js: 13 lulus, 0 gagal; server/projects.js dibuat. Wiring server.js + sweep() berkala belum (item integrasi) |
| t10a-guard | Penjaga keamanan server: Host, Origin, header, CSP, file statis aman | node --test test/unit/guard.test.js: 11 pass 0 fail (diperiksa orkestrator); server/guard.js baru, belum tersambung ke server.js; catatan: skrip tema inline di index.html harus dipindah sebelum CSP dipasang (masuk t13a/penyambungan) |
| t13a-kerangka-html | Pecah index.html: kerangka markup semua id, huruf, boot.js | docs/mockups/t13a/kerangka.png ada; Playwright: 6 request 200, 41 id unik, konsol bersih, 0 pelanggaran CSP; node --test test/unit/*.test.js 109 lulus. Catatan: css/js build lama dikosongkan, test/ui gagal sampai T26 |
| k-pulihkan-run | Perlukah run yang sedang jalan dipulihkan bila server diganti di tengah? | Keputusan pemilik: tidak (T31 ditolak) |
| fix-sec-laporan-project | Perbaiki celah keamanan: Laporan token menerima alamat proyek mentah dari luar | node --test test/unit/*.test.js: 69 lulus, 0 gagal (agent); report-project.test.js: 2 lulus, 0 gagal (dicek ulang) |
| qa-kunci-laporan-project | Kunci uji: Laporan token menolak proyek tak dikenal | node --test test/http/report-project.http.test.js: 2 lulus, 0 gagal; uji balik (perbaikan dibalik) gagal 1 sesuai harapan |
| sec-laporan-project | Cyber: uji tembus Laporan token (alamat proyek, tulis file salinan) | Uji tembus curl di server sementara: traversal, path absolut, kosong, %00 -> 400; tulis hanya di folder terdaftar; n besar aman. 0 critical/high, 2 medium, 2 low (dijadikan item) |
| fix-riwayat-laporan-baris | Perbaiki Riwayat: tombol Laporan per baris tidak lagi menimpa tombol Buka | node --test test/ui/ui.test.mjs: 25 lulus, 0 gagal (agent, playwright sementara); screenshot test/ui/r1-buka.png. Terbuka: R1(c) lebar 1200 menunggu t23a; klik pakai force:true |
| qa-kunci-riwayat-buka-r1 | Kunci uji: klik Buka di Riwayat membuka run, bukan laporan (R1) | test/ui/ui.test.mjs tes R1 (baris 136) dan R1c (149); node --test: 26 lulus 0 gagal; R1 gagal bila klik Buka dibalik ke modal (25 lulus, 1 gagal). Catatan: judul laporan asli dari server tidak diuji, mock mencegat /report/tokens.md |
| design-dial-dan-rujukan | Lengkapi DESIGN: bagian Dial per jenis area dan rujukan detail satu kolom (§8 butir 5) | docs/DESIGN.md: bagian 'Dial per jenis area' (baris 12) dan butir 8.5 detail agent satu kolom berlipat (baris 191) ada |
| rujukan-tasks-detail | Selaraskan TASKS.md: T19 detail satu kolom (bukan empat tab) dan nomor bagian UX | TASKS.md: 'empat tab' 0 hit, fv-dsec 1 hit, T32-T34 ditambah; +8/-5 baris |
| t33a-laporan-server | Laporan token: proyek tepat, persen dari setara, tiga penyumbang teratas, batas 200 run | node --test test/unit/tokens.test.js: 11 lulus, 0 gagal (4 tes baru); build() top-3 + limit 200 + writeCopy; server.js default n 60->200 |
| t34a-backlog-bagian-server | Backlog per bagian: keadaan bagian, baris jawaban, urutan item (server) | node --test test/unit/backlog-sections.test.js: 11 lulus, 0 gagal; suite test/unit/*.test.js 109 lulus. Diubah: server/backlog-summary.js (bukan backlog.js) |
| fix-sec-laporan-host-origin | Perketat keamanan server lokal: tolak situs asing mendaftarkan folder, membaca laporan, atau mereset | node --test test/unit + test/http: 78 tes, 78 lulus, 0 gagal; tes baru test/http/security.http.test.js (7 tes, 5 gagal sebelum perbaikan). Terbuka: 415 belum di ARCHITECTURE.md, /history/rescan masih kirim err.message, symlink file tidak diuji di Windows |
| qa-r1-klik-nyata | Uji ulang R1 dengan klik nyata: tombol Buka di Riwayat tidak tertutup elemen lain di semua lebar | ui.test.mjs 29/29 lulus, R1-klik-nyata 3/3 (1440/1200/900). Uji balik: sebelum fix app.css .sm tes gagal 3/3 (BUTTON[hscan] menutup Buka); balik 3716beb history.js menggagalkan R1 dan R1c |
| sec-sisa-host-origin | Sisa pengetatan server: kode 415 di ARCHITECTURE, /history/rescan tanpa pesan galat mentah, uji symlink di Windows | security.http.test.js 8/8 lulus; ARCHITECTURE catat 415; rescan kode galat tanpa err.message; tes junction lulus |
| fix-sm-selektor-tombol | Tombol Analisis di Riwayat tidak lagi menimpa tombol Buka (perbaiki selektor CSS .sm) | app.css:78-79 .sm:not(.btn); node --test R1-klik 3/3 lulus (1440/1200/900) |

## Ide / nanti (diparkir, belum dikerjakan)

- ekspor-laporan-teks: Ekspor laporan teks markdown dari Ringkasan run - PRD F10 = Nanti. Asal: T24 TASKS dihapus dari UI v2; endpoint /report tetap ada tanpa menu. Keluarkan bila pemilik menyetujui (agent prd perlu menaikkan prioritas F10)
- selaraskan-adr0002-subfolder: Selaraskan ADR 0002 dan ARCHITECTURE 4.3 soal sesi di subfolder (induk terluar atau proyek sendiri) - asal: t09a-projects-kunci; projects.js memilih induk terluar yang dikenal (ARCH 4.3 no.3), ADR 0002 Konsekuensi bilang subfolder tetap proyek sendiri
- aturan-macet-terlalu-literal: Aturan Macet PRD F11 terbaca literal: 13 bagian macet padahal menunggu bagian lain yang berjalan (putusan pemilik) - asal: t34a-backlog-bagian-server
- selaraskan-nama-backlog-summary: ARCHITECTURE.md menyebut server/backlog.js, modul sebenarnya server/backlog-summary.js - asal: t34a-backlog-bagian-server
- t13a-sisa-js-lama: Putuskan nasib js/header.js, js/model.js, js/md.js (lama, tak dimuat) dan uji UI lama yang gagal sampai T26 - asal: t13a-kerangka-html

## Ditolak

- t31-pulihkan-run: Pulihkan run belum selesai dari Riwayat bila server diganti < 15 menit (-)

