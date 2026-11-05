# Status evaluasi kit (dibuat 3 Nov 2026 malam)

Pelacak bagian kit mana yang sudah dievaluasi ulang berdasarkan bukti (run TOconnect, Flow Viewer, laporan token) dan mana yang belum. Perbarui tiap selesai mengevaluasi satu bagian.

## Sudah dievaluasi
| Bagian | Hasil | Rincian |
|---|---|---|
| UI/UX (prd bagian bisnis, ux, ui-designer, ui-direction, ui-critic, template DESIGN.md, backlog aturan 6) | Diperbaiki 3 Nov, belum commit | `TEMUAN-2026-11-03-landing-dashboard.md`, CHANGELOG "Agent ux per jenis layar" + "UI per jenis layar" |

### Sisa UI/UX: evaluasi setelah perubahan (uji nyata)
- [x] ux jalur pemasaran (run 3 Nov 19.15, `ux-landing-ajakan`): lulus.
- [x] ux jalur dashboard (Flow Viewer, 3 Nov 21.40): dashboard-design + ux-writing-id dimuat, referensi 18/21/05 dibaca, tampilan asli di-screenshot (1440 + HP) sebelum menilai. Temuan akar "campur aduk": 4 keputusan yang sudah dijawab masih berstatus perlu keputusan; detail gagal tanpa alasan; tombol Laporan per baris menimpa Buka. Usulan per pertanyaan layar, 3 ya/tidak, "tidak ada usulan perubahan PRD" dinyatakan eksplisit. Lulus.
  - Catatan: ux menulis ulang UX.md utuh dan nomor bagian berubah, sehingga TASKS.md/backlog/DESIGN.md merujuk nomor lama. Diperbaiki di kit: update per bagian, nomor lama dipertahankan, peta lama->baru bila terpaksa.
  - architect (sinkron PRD v1.2) menemukan bug keamanan di kode jalan: laporan token menerima path mentah `?project=` dengan fallback ke folder server terakhir.
- [x] backlog Flow Viewer setelah UX v1.2 (diulang 4 Nov 07.19): 79 -> 103 item, validate lulus. Irisan bug-laporan (fix keamanan, uji kunci, uji tembus, tombol Laporan) paling dekat siap; aturan 6 dipakai: item ui-designer/ui-critic dashboard membawa UX.md Penggolongan + bagian layar + DESIGN.md Dial per jenis area; item design-dial-dan-rujukan menambah tabel dial. Sisa: ui-b-tab-data belum membawa konteks jenis layar; 8 item l lama belum dipecah. Desain Backlog/Detail baru terbuka setelah 33 item (Live dibangun + kritik 2 putaran).
- Catatan 4 Nov 07.22: `/fullstack-dev:run` di root kit berhenti dan menyarankan tulis PRD dari awal, karena backlog.js relatif ke folder sesi sedangkan agent lain menemukan PRD Flow Viewer lewat project-context. run.md diperbaiki: cari backlog di subfolder dan minta sesi dibuka di folder proyek.
- Batch run pertama Flow Viewer (4 Nov 07.23, sesi di folder flow-viewer): 5 item selesai (rujukan TASKS + 4 item be refactor run.js), 58 tes lulus, commit 9902311, 6,6 jt token mentah (~1,3 jt/item). Masalah: item bug keamanan/tombol Laporan (diminta pemilik paling awal, value high) dilewati karena urutan `ready` mendahulukan irisan yang sudah dimulai. Diperbaiki: nilai `urgent` di backlog.js + skill; 5 item irisan bug-laporan diberi urgent, fix-sec kini teratas.
- Batch kedua (4 Nov 07.45): `urgent` bekerja, 4 item bug-laporan + t07 selesai (commit 3716beb): laporan token hanya proyek terdaftar (uji balik membuktikan tes bisa gagal), uji tembus cyber 0 critical/high, tombol Laporan pindah ke kepala Riwayat. Catatan: tes UI R1 memakai klik `force: true` (awasi di qa-kunci-riwayat-buka-r1); item perbaikan baru dari cyber (host/origin, medium) dibuat `mid`, diubah ke `urgent` + aturan skill ditambah.
- Batch ketiga (4 Nov 07.58, commit c61f474): 3 item. design-dial-dan-rujukan LULUS (ui-designer menambah tabel Dial per jenis area di DESIGN.md lama, semua area dashboard, dial per area). fix-sec host/origin: 7 tes baru, 5 gagal sebelum perbaikan. qa-kunci R1: TIDAK SAH, klik lewat dispatchEvent (tumpang tindih tidak tertangkap), uji balik memutasi handler bukan mengembalikan perbaikan. Catatan "Terbuka" (415, rescan err.message, symlink Windows) hanya tertinggal di evidence. Diperbaiki: aturan uji regresi di qa.md, aturan catatan Terbuka -> item diparkir di skill backlog; item qa-r1-klik-nyata (urgent) dan sec-sisa-host-origin ditambahkan.
- [x] Aturan qa uji regresi (batch 4 Nov 08.10, commit 271a60e): LULUS dan menemukan bug nyata. Klik nyata di 1440/1200/900 gagal 3/3 sebelum perbaikan: tombol Analisis (selektor CSS .sm) masih menutup Buka, jadi perbaikan 3716beb belum tuntas dan tes dispatchEvent sebelumnya meloloskannya. Alur benar: qa gagal -> agent backlog menambah fix-sm-selektor-tombol -> fe memperbaiki -> qa ulang lulus; uji balik dengan mengembalikan perbaikan sebenarnya. Catatan sisa (liveIds di server.js) dirujuk ke item t09a yang ada, tidak hilang.
- [ ] ui-designer jalur pemasaran (`re-mockup-landing`) + ui-critic uji 5 detik.
- [ ] ui-designer jalur dashboard (`re-mockup-admin-klien` / operator) + ui-critic first-glance.
- [~] prd-review baru (prd-check Flow Viewer, 3 Nov 20.02): 13 temuan valid (4 Tinggi), #6 menyentuh aturan masalah dashboard, tetapi tidak menangkap panel Backlog/Riwayat/Detail tanpa pertanyaan (temuan 11 terlalu "per peran") dan kolom Jenis. Diperbaiki: temuan 11 + area 10 per layar/panel. Catatan: keluhan pemilik tidak ikut karena prd-check hanya audit; masuk lewat mode update.
- [x] prd mode update Flow Viewer (3 Nov 21.30): PRD v1.2, tabel Layar dengan Jenis + Pertanyaan utama + Keputusan + Keadaan masalah untuk Live, Detail, Backlog, Riwayat, Laporan token; F11 Backlog per bagian (irisan) dengan baris jawaban di atas; F4 detail dengan pertanyaan utama; F12 Laporan token. Lulus.
  - Catatan 1: prd tidak bertanya interaktif; dua angka (agent diam > 10 mnt, token boros > 150%) diputuskan agent dan ditandai untuk dicek pemilik. Wajar karena subagent latar; pantau di proyek baru.
  - Catatan 2: sebagian AC sudah menyentuh bentuk (urutan, lipat, label, potong 12 baris, Esc/klik luar). Belum diubah di kit; bila nanti ux/ui-designer terhalang, ux memakai "Usulan perubahan PRD".
- [ ] ui-direction baru (layar kunci per jenis) di proyek berikutnya.
- [ ] Biaya token setelah skill tambahan (laporan-token.md).
- [ ] Evaluasi akhir UI/UX setelah semua run di atas.

## Belum dievaluasi (sinyal dari data TOconnect 29 Okt - 3 Nov)
| Bagian | Sinyal yang perlu dicek |
|---|---|
| Flow Viewer | Dikerjakan berikutnya (pemilik, 3 Nov): bug di Riwayat; fungsi kurang terlihat; panel backlog campur aduk. Lihat bagian Flow Viewer di bawah. |
| Orkestrator dan alur (`start`, `run`, `build`, `backlog`) | 570 jt token mentah, 86 jam (33 jam menunggu pemilik, 5x limit); orkestrator 26% token di awal; backlog tumbuh 147 -> 258 item; redesain menambah 61 item setelah build hampir selesai. |
| be | 25% token (72 pemanggilan, 1.673 giliran, rata-rata 23 giliran); 2/3 model opus. |
| fe, qa | qa 23 pemanggilan 535 giliran; fe di sonnet. Kualitas penyambungan dan cakupan tes belum dinilai. |
| architect | ARCHITECTURE.md TOconnect 90 KB (biaya baca tiap item); 3 pemanggilan 102 giliran. |
| cyber + security-checklists | Checklist masih OWASP umum; audit-akhir TOconnect sempat BLOCK (2 Nov) lalu PASS. |
| backlog (skill + backlog.js) | Satu sesi satu batch; item `re-` dan item UX baru menumpuk; ukuran efek hemat token 31 Okt belum diukur. |
| prd / prd-review (selain bagian bisnis) | PRD TOconnect 82 KB; Decision log panjang. |
| Deploy/CI | Sengaja belum ada agent. |
| Hemat token / file caching | Pemilik akan bertanya lagi. |

## Flow Viewer: catatan awal (3 Nov malam)
- Keputusan pemilik (3 Nov 20.00): jalur 2, v2 dibuat ulang lewat kit (prd-check -> ux lensa dashboard -> desain: pertahankan "Gading" + dial per jenis + mockup ulang Backlog/Riwayat/Detail, atau ui-direction baru -> backlog diselaraskan -> run). Sekaligus uji nyata jalur dashboard.
- Bug terkonfirmasi pemilik: tombol "Laporan" di Riwayat (satu-satunya bug yang diketahui sejauh ini). Usul: item kecil pertama di backlog v2 karena viewer dipakai tiap hari.
- Keluhan pemilik: prinsip UI masih kurang di bagian detail (panel detail agent); backlog campur aduk.
- Risiko: v2 dibangun di folder dan port yang sama dengan viewer yang dipakai memantau. Usul: v2 di port lain (FLOW_VIEWER_PORT) sampai lulus QA.
- Flow Viewer sendiri proyek kit: `plugins/flow-viewer/docs/` punya PRD, UX, DESIGN (arah A), backlog v2: 9/79 selesai, berhenti sejak 27 Okt. Item Riwayat (`ui-b-riwayat-runlama`, `t23a-riwayat`) dan tab Backlog (`t18a-panel-rel-percakapan-backlog`, `ui-b-tab-data`) masih todo. Kode yang jalan = 1.x yang ditambal.
- UX/desain v2 dibuat sebelum perbaikan kit 3 Nov; Flow Viewer adalah dashboard, jadi UX-nya perlu lewat jalur dashboard baru (sekaligus uji jalur itu).
- Teramati di Riwayat: judul baris hanya nama flow ("run" berulang ~30 kali) sehingga run tidak bisa dibedakan; run terakhir berlabel "sedang berjalan" padahal sudah selesai (status header "Selesai", /history finished=1); tombol "Buka" pada satu baris membuka Laporan token proyek (perlu dicek ulang, bisa salah klik).
- Teramati di Backlog: "Per fase" dikelompokkan per tipe item (be, fe, ui, review...), bukan per irisan/area/layar; "Semua item" daftar datar 258 item dengan teks bukti panjang; tidak ada pengelompokan irisan (mis. redesign-e), saring status, atau urutan "berikutnya".
