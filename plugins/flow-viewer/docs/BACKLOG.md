# Backlog - Flow Viewer v2

Diperbarui otomatis oleh backlog.js. Jangan edit tangan; ubah lewat perintah atau agent backlog.

**Progres: 46/107 selesai** · berjalan 0 · siap 3 · menunggu 58 · gagal 0

## Siap dikerjakan

| ID | Jenis | Judul | Agent | Nilai/Usaha |
|---|---|---|---|---|
| t16c-live-tinggi-laptop | fe | Tampilan Live muat di layar laptop nyata (tinggi pendek) | fe | high/m |
| t17-indikator | fe | Tiga indikator besar: siapa kerja, progres, token (menempel) | fe | high/m |
| t18a-panel-rel-percakapan-backlog | fe | Panel samping dan rel (enam kunci) + tab Percakapan | fe | high/m |

## Menunggu dependensi

| ID | Judul | Menunggu |
|---|---|---|
| t19a-detail-mode | Detail agent di panel: satu kolom, status lipat disimpan, Esc tidak menggeser grafik | t18a-panel-rel-percakapan-backlog |
| t24-tema-menu-lainnya | Tema dan menu Lainnya (Reset run dua langkah); Laporan teks dihapus | t17-indikator |
| t20a-kotak-pemberitahuan | Kotak Butuh input dan Gagal di Live, lengkap dengan pilihan jawaban | t17-indikator |
| t20b-notifikasi-bunyi | Judul tab berkedip, bunyi, dan notifikasi desktop | t20a-kotak-pemberitahuan |
| t21-ringkasan-run | Ringkasan run otomatis dan lewat tombol "Ringkasan" | t20a-kotak-pemberitahuan |
| critic-live-r1 | Kritik tampilan Live nyata (putaran 1) | t16c-live-tinggi-laptop, t17-indikator, t18a-panel-rel-percakapan-backlog, t19a-detail-mode, t24-tema-menu-lainnya |
| fix-live | Perbaiki temuan wajib kritikus Live | critic-live-r1 |
| critic-live-r2 | Kritik tampilan Live nyata (putaran 2, terakhir) | fix-live |
| critic-notif-r1 | Kritik kotak pemberitahuan dan Ringkasan run nyata (putaran 1) | t20a-kotak-pemberitahuan, t20b-notifikasi-bunyi, t21-ringkasan-run |
| fix-notif | Perbaiki temuan wajib kritikus pemberitahuan dan Ringkasan | critic-notif-r1 |
| critic-notif-r2 | Kritik kotak pemberitahuan dan Ringkasan (putaran 2, terakhir) | fix-notif |
| qa-a-fixture-feed | Uji UI: fixture feed.js dan skrip tes lama dipindah ke test/ui/ | critic-live-r2, critic-notif-r2 |
| qa-a-acceptance | Uji penerimaan layar Live: F2, F3, F4, F5, F6, F7 + tinggi laptop | qa-a-fixture-feed |
| review-kode-klien | Cyber: review kode klien Tahap A (graph, panel, alerts, notify, summary) | t18a-panel-rel-percakapan-backlog, t19a-detail-mode, t20b-notifikasi-bunyi, t21-ringkasan-run, t33b-laporan-fe, t34b-backlog-fe, t19b-detail-lengkap |
| ui-b-daftar-proyek | Desain Daftar proyek (/), keadaan kosong, memuat, terputus | critic-live-r2, critic-notif-r2 |
| ui-b-riwayat-runlama | Desain Riwayat selebar layar (6 kolom, selisih + Boros) dan run lama (bangun) | critic-live-r2, critic-notif-r2 |
| ui-b-tab-data | Desain tab File (diff), Skill, dan state lengkap Percakapan/Backlog | critic-live-r2, critic-notif-r2 |
| ui-b-tab-token-log | Desain tab Token (tabel per agent) dan Log (linimasa) | critic-live-r2, critic-notif-r2 |
| ui-b-detail-state | Desain detail agent satu kolom: jawaban di atas, bagian berlipat (bangun) | critic-live-r2, critic-notif-r2 |
| ui-b-state-global | Desain state global: kosong, memuat, terputus, tanpa flow, notifikasi diblokir | critic-live-r2, critic-notif-r2 |
| ui-b-sempit | Desain tampilan di bawah 900 px: daftar kartu agent dan lapisan panel | critic-live-r2, critic-notif-r2 |
| t22-daftar-proyek | Bangun Daftar proyek, pengalih proyek, judul tab | ui-b-daftar-proyek |
| t23a-riwayat | Bangun Riwayat selebar layar: tabel 6 kolom, selisih + Boros, tren, banding, hapus | ui-b-riwayat-runlama-audit, t21-ringkasan-run |
| t23b-run-lama | Bangun tampilan run lama (hanya baca) | t23a-riwayat, t19a-detail-mode |
| t18b-tab-file-skill-state | Bangun tab File (diff di tempat), Skill, dan state lengkap Percakapan/Backlog | ui-b-tab-data, t18a-panel-rel-percakapan-backlog |
| t18c-tab-token-log | Bangun tab Token (tabel per agent) dan Log (linimasa) | ui-b-tab-token-log, t18a-panel-rel-percakapan-backlog |
| t19b-detail-lengkap | Bangun isi detail agent: kepala, peringatan, jawaban, tiga angka, delapan bagian berlipat | ui-b-detail-state-audit, t19a-detail-mode |
| t25a-state-global | Bangun state global: kosong, memuat, terputus, tanpa flow, notifikasi diblokir | ui-b-state-global, t20b-notifikasi-bunyi |
| t25b-agent-luar-flow | Bangun penandaan agent di luar flow | ui-b-detail-state-audit |
| t25c-sempit | Bangun tampilan di bawah 900 px | ui-b-sempit, t18a-panel-rel-percakapan-backlog, t19a-detail-mode |
| critic-b1-r1 | Kritik Daftar proyek, Riwayat, dan run lama (putaran 1) | t22-daftar-proyek, t23a-riwayat, t23b-run-lama |
| fix-b1 | Perbaiki temuan wajib kritikus: proyek, Riwayat, run lama | critic-b1-r1 |
| critic-b1-r2 | Kritik Daftar proyek, Riwayat, run lama (putaran 2, terakhir) | fix-b1 |
| critic-b2-r1 | Kritik tab data, detail node, state, di luar flow, < 900 px (putaran 1) | t18b-tab-file-skill-state, t18c-tab-token-log, t19b-detail-lengkap, t25a-state-global, t25b-agent-luar-flow, t25c-sempit |
| fix-b2 | Perbaiki temuan wajib kritikus: tab data, detail, state, sempit | critic-b2-r1 |
| critic-b2-r2 | Kritik tab data, detail, state, sempit (putaran 2, terakhir) | fix-b2 |
| qa-b-acceptance | Uji penerimaan Tahap B: F1, F8, F9, state, < 900 px; skrip lama semua jalan | critic-b1-r2, critic-b2-r2, qa-a-acceptance, critic-b3-r2, qa-laporan-token, qa-backlog-bagian, qa-detail-satu-kolom |
| qa-audit-visual | Audit visual ui-craft 900/1440 terang/gelap dan ukuran teks node | qa-b-acceptance |
| qa-perf | Uji beban: 3 proyek x 12 agent x 30 event/dtk selama 60 dtk | qa-a-fixture-feed |
| sec-klien-xss | Cyber: keamanan klien akhir (XSS, CSP, judul tab, notifikasi) | qa-b-acceptance |
| t30-rilis | Rilis v2.0.0: README, versi, status proyek | qa-b-acceptance, qa-audit-visual, qa-perf, sec-klien-xss, review-kode-klien |
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
| t09b-snapshot-proyek | Snapshot ditambah proyek, progres, token pembanding, pemberitahuan | node --test test/unit + test/http: 144 lulus 0 gagal (10 tes baru run-snapshot, 1 projects); node --check server/server.js ok |
| t10a-guard | Penjaga keamanan server: Host, Origin, header, CSP, file statis aman | node --test test/unit/guard.test.js: 11 pass 0 fail (diperiksa orkestrator); server/guard.js baru, belum tersambung ke server.js; catatan: skrip tema inline di index.html harus dipindah sebelum CSP dipasang (masuk t13a/penyambungan) |
| t10b-server-endpoint | Server melayani banyak proyek: /projects, ?p=, stream lama, batas koneksi | node --test test/http + test/unit: 163 lulus 0 gagal; node --check server.js ok; server hidup port 4799: curl /health ok, /projects latest=beta 2 proyek, /state?p=alfa live:true, /state?p=zzz 404 project_not_found |
| t11-uji-http | Uji HTTP: proyek terisolasi, alamat lama, serangan umum | node --test test/http/*.test.js: 27 lulus 0 gagal 1 todo (limits.http.test.js baru, 5 tes). F1-1/F1-3 tercakup. CATATAN: tes 'transcript_path di luar ~/.claude' diberi todo karena bug nyata di server.js (readText tanpa safePath); perbaikan urgent t11-fix-transcript-path |
| t12-replay-nyata | Replay event nyata (73 Stop) sebelum layar dibangun | node test/replay.js exit 0: 473 Stop berlabel, salah 13 = 2.7% (awal 14.0%, ambang 10%); node --test unit+http: 179 lulus 0 gagal; fixture test/fixtures/events/stop-tersamar.jsonl + labels.json |
| k-ambang-selesai | Seberapa ketat tanda "Selesai" setelah hasil replay nyata | Keputusan pemilik: Terima: notifikasi Selesai tetap; meleset 2,7% (13/473) di bawah ambang 10% |
| sec-server-hardening | Cyber: hardening server (Host/Origin, CSP, path traversal, batas ukuran) | Review cyber PASS: 0 tinggi/kritis, 1 menengah, 4 rendah. Uji tembus port 4801: Host 11 kasus, Origin/Sec-Fetch-Site 35/35 403, traversal statis 30 variasi 404, payload 413, transcript_path di luar akar/junction tidak terbaca; node --test unit+http 169 lulus |
| review-kode-server | Cyber: review kode kelompok server (run, projects, attention, server) | Review ulang cyber: LULUS, tidak ada temuan tinggi terbuka; 4 perbaikan diverifikasi di kode asli (agents.js:115-120 batch, null flow() aman di 2 pemanggil, /\s+/ benar); node --test unit+http 183 lulus 0 gagal. Menengah/rendah lain diparkir (review-server-*) |
| t13a-kerangka-html | Pecah index.html: kerangka markup semua id, huruf, boot.js | docs/mockups/t13a/kerangka.png ada; Playwright: 6 request 200, 41 id unik, konsol bersih, 0 pelanggaran CSP; node --test test/unit/*.test.js 109 lulus. Catatan: css/js build lama dikosongkan, test/ui gagal sampai T26 |
| t13b-rute-app | Rute halaman: daftar proyek, tampilan proyek, Riwayat, buka otomatis bila satu proyek | node --test test/unit/route.test.js: 6 lulus 0 gagal; 8 screenshot rute-1..8 ada di scratchpad (Playwright 8 skenario, galat konsol hanya 500 yang sengaja dipicu) |
| t14a-dom-format | Dasar tampilan aman: dom.js (escape otomatis), format, ikon | node --test test/unit/dom-format.test.js: 8 lulus 0 gagal; grep innerHTML/outerHTML/insertAdjacentHTML di server/public selain js/dom.js = 0 |
| t14b-api-sse | Klien data live: SSE, sambung ulang, bilah terputus dengan jam pembaruan | test/unit/api.test.js 4 lulus; Playwright test/ui/live-conn.test.mjs 3 lulus 0 gagal (putus-sambung server); screenshot test/ui/t14b-terputus.png |
| t15a-tokens-tema | Token desain Gading: huruf, warna, bayangan, dua tema | server/public/css/tokens.css terisi 4646 B, 21 peran warna x2 tema; skrip kontras: FAIL 0, teks >=4.5:1, garis >=3:1; --warn-line terang #B07410 (3,46:1 vs warn-soft) |
| t15b-komponen-dasar | Komponen dasar: bilah atas, pita, kotak, panel, rel, node, tab | server/public/css/app.css 30447 B; 6 screenshot di docs/mockups/t15b/screenshots/ (1440x900 dan 900x780, terang/gelap); run-audit --widths 900,1440 --tokens: tinggi 0, kontras 0, VERDICT LULUS (audit-light/dark.json) |
| t16a-graph-layout | Grafik workflow live: layout node, konektor, crew bawaan | node --test test/unit: 165 lulus 0 gagal (10 baru graph.test.js); Playwright test/ui/graph.test.mjs: 6 lulus 0 gagal (14 node 0 tumpang tindih, teks min 12 px di 1440 dan 900, update 13 ms); screenshot test/ui/t16a-1440.png, t16a-900.png |
| t16b-graph-zoom | Zoom, pan, pas layar, seleksi, dan keyboard pada grafik | Playwright graph-zoom.test.mjs + graph.test.mjs: 13 lulus 0 gagal (zoom min 74%, jalur kontrol 48 px, tumpang tindih 0, Tab/Enter/Esc, outline 3 px ink); node --test test/unit: 165 lulus 0 gagal |
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
| t11-fix-transcript-path | Perbaiki: transcript_path di luar ~/.claude harus ditolak (pasang safePath usage.js ke server.js), hapus todo di tesnya | node --test test/http/*.test.js test/unit/*.test.js: 169 tes, 169 lulus, 0 gagal, 0 todo; opsi todo di limits.http.test.js dihapus (grep todo = 0) |
| review-fix-server | Perbaiki temuan review server: flag batch sampai ke server asli (tinggi), flow tak dikenal jadi null, regex \s+ di /report.md, evIndex dibersihkan, tes lewat katalog asli | node --test test/unit + test/http: 183 lulus 0 gagal; test/unit/katalog-asli.test.js 4 lulus (flow('run').batch true, flow tak dikenal null, huruf s utuh di JEDA). Temuan 6 (evIndex) tanpa tes. Tes baru ditulis sesudah perbaikan |

## Ide / nanti (diparkir, belum dikerjakan)

- ekspor-laporan-teks: Ekspor laporan teks markdown dari Ringkasan run - PRD F10 = Nanti. Asal: T24 TASKS dihapus dari UI v2; endpoint /report tetap ada tanpa menu. Keluarkan bila pemilik menyetujui (agent prd perlu menaikkan prioritas F10)
- selaraskan-adr0002-subfolder: Selaraskan ADR 0002 dan ARCHITECTURE 4.3 soal sesi di subfolder (induk terluar atau proyek sendiri) - asal: t09a-projects-kunci; projects.js memilih induk terluar yang dikenal (ARCH 4.3 no.3), ADR 0002 Konsekuensi bilang subfolder tetap proyek sendiri
- aturan-macet-terlalu-literal: Aturan Macet PRD F11 terbaca literal: 13 bagian macet padahal menunggu bagian lain yang berjalan (putusan pemilik) - asal: t34a-backlog-bagian-server
- selaraskan-nama-backlog-summary: ARCHITECTURE.md menyebut server/backlog.js, modul sebenarnya server/backlog-summary.js - asal: t34a-backlog-bagian-server
- t13a-sisa-js-lama: Putuskan nasib js/header.js, js/model.js, js/md.js (lama, tak dimuat) dan uji UI lama yang gagal sampai T26 - asal: t13a-kerangka-html
- t15a-selaraskan-design-md: Selaraskan DESIGN.md dengan tokens.css: --warn-line #B07410, baris kontras warn-line, token baru - asal: t15a-tokens-tema. DESIGN §2 masih #C98513; tambah token --bw-1..3, --focus-offset, --select-offset, --control-h
- t15a-ok-line-di-ok-soft: Pastikan ok-line tidak dipakai di atas ok-soft (2,95:1, di bawah 3:1) - asal: t15a-tokens-tema. Terang: ok-line/ok-soft 2,95; ok-line/ground 3,02
- t14a-css-ikon-status: CSS ikon status: warna dan animasi putar Berjalan (.ic-*) - asal: t14a-dom-format. icons.js memakai class ic ic-<status>; belum ada gaya di css/
- t14a-peta-status-input: Petakan status node 'butuh input' ke kunci 'input' di icons.js/app - asal: t14a-dom-format. run.js hanya idle/running/done/failed/skipped/optional; format token 'rb'/'jt' ikut UX.md, perlu konfirmasi
- t09b-sambung-t10b: Sambungan sisa snapshot ke server: compare/project di server.js, sapuan 30 dtk quiet, dropCompare setelah hapus Riwayat, agregat attention untuk /projects, baris Riwayat deltaPct/boros - asal: t09b-snapshot-proyek; ranah t10b. progress.label kosong bila pct null (klien tampilkan '-')
- t15b-docs-komponen: Tulis docs/KOMPONEN.md dari kontrak komponen di komentar kepala app.css - asal: t15b-komponen-dasar. Juga: kandidat seri k-big vs n-title 28 px (rendah); kontrol zoom menutupi node di 900 (masalah #4) milik t16b/t16c
- t14b-css-offline: CSS bilah #offline (#offline[hidden]{display:none}) - asal: t14b-api-sse
- t14b-sisa-klien: Klien: fetch otomatis dengan p, pemantau koneksi macet diam-diam, playwright terpasang di proyek (tes memakai env PW) - asal: t14b-api-sse. ARCHITECTURE baris 47 belum dikerjakan; shortcut tanpa pemantau ping
- t10b-selaras-token-json: Selaraskan kontrak /report/tokens.json dengan keluaran token-report.js (perRun/perAgent/costliest/limit:200) dan pasang usage.js inkremental - asal: t10b-server-endpoint. Juga: perintah uji 'Run locally' pakai glob test/**/*.test.js; sapuan diam 10 mnt tanpa uji otomatis; uji beban 3 proyek x 12 agent (T28) belum ada
- sec-proto-pollution-agent: Perbaiki prototype pollution: agent_type/subagent_type '__proto__' mencemari Object.prototype server (menengah) - asal: sec-server-hardening, temuan MENENGAH. run.js:109,194 dan agents.js:100: nodes/details/fileSets/defs/display jadi Object.create(null) atau Map, atau tolak nama di luar /^[a-z0-9][a-z0-9._:-]*$/. Juga /detail?id=constructor 500 (rendah). Kode sedang dipakai: jadwalkan urgent
- sec-server-rendah: Hardening rendah server: GET /report/tokens.md menulis file (tolak cross-site), cwd palsu menulis .flow-viewer di luar proyek, transcript_path dibatasi projects/** dan */subagents/*, riwayat per cwd tanpa batas - asal: sec-server-hardening, 4 temuan RENDAH (server.js:455-461, 268-280; token-report.js:169; usage.js:125; server.js:111)
- t12-sinkron-dokumen: Selaraskan dokumen dengan aturan batas run baru: ARCHITECTURE 5.1/5.2(c), adr/0001-batas-run (tugas shell, flag batch, asksOwner, pembersihan node basi, jumlah Stop 498) - asal: t12-replay-nyata
- t12-event-gagal: Dukung event StopFailure dan PostToolUseFailure: cabang case di run.js dan daftarkan di hooks/hooks.json - asal: t12-replay-nyata. Didukung Claude Code 2.1.314 tapi belum terdaftar, event tak dikenal kini ditolak
- t12-nilai-ulang-sampel: Pemilik menilai ulang 13 Stop salah (node test/replay.js --table) karena label hanya satu penilai - asal: t12-replay-nyata. 8 jeda terbaca selesai (menunggu jawaban Commit tanpa petunjuk teks), 5 selesai terbaca jeda
- review-server-usage-inkremental: Pakai usage.js inkremental di server.js (hapus parseUsage/agentUsage/readText duplikat), analyze hanya pada refresh paksa; tes - asal: review-kode-server temuan MENENGAH 4: transkrip 109 MB menahan event loop 0,3-0,5 dtk per refresh, melanggar ARCHITECTURE 9. Gabung dengan t10b-selaras-token-json
- review-server-induk-proyek: Konfirmasi ADR 0002: induk terluar menang meleburkan proyek bila sesi pernah dibuka di folder induk; abaikan induk tanpa docs/ atau .claude/, akar drive, home - asal: review-kode-server temuan MENENGAH 5 (projects.js:64). Keputusan pemilik
- review-server-rendah: Rendah server: id run bertabrakan lintas proyek (store.nextId), penjaga masuk ganda /history/rescan, urutan log, tes pembersihan node basi dan rescanRun, bersihkan duplikasi (-80 baris), cek rotasi events.jsonl 238 MB di server berjalan - asal: review-kode-server temuan RENDAH 7-9 dan catatan belum diperiksa (events.jsonl 238 MB tanpa events.1.jsonl, kemungkinan server lama)
- t16a-crewmeta-label: Server mengirim label, role, ikon per node di crewMeta (kini hanya id/col/row, node tampil id mentah) - asal: t16a-graph-layout. graph.js sudah membaca node.label lalu crewMeta.label lalu id
- t16a-diam-luar-flow: Penanda 'Diam N mnt' di node dan tampilan agent di luar flow yang redup; ukur ulang lebar panggung saat panel dan rel terhubung (t16c, t18a) - asal: t16a-graph-layout. Di luar F2-1/3/4
- t16b-ui-test-pw: test/ui/ui.test.mjs gagal: mengimpor playwright langsung, tidak membaca env PW; pasang playwright di proyek atau satukan pemuat - asal: t16b-graph-zoom; kegagalan sudah ada sebelum item. Gabung dengan t14b-sisa-klien
- t16b-simpan-zoom: Simpan pengaturan zoom di localStorage (PRD Pengaturan tampilan, opsional); fv-pick belum didengarkan panel (t18a) - asal: t16b-graph-zoom. Maks zoom 200% asumsi agent (tidak ada di DESIGN)

## Ditolak

- t31-pulihkan-run: Pulihkan run belum selesai dari Riwayat bila server diganti < 15 menit (-)

