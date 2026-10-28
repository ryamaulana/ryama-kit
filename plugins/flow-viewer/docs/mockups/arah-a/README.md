# Arah A: Gading (DIKUNCI 2026-10-27)

Token, aturan, dan kontras lengkap ada di `docs/DESIGN.md` (Approved). Berkas ini hanya menjelaskan mockup.

Berkas: `live.html` (Live, 12 agent = 14 node), `ringkasan.html` (Ringkasan run), `arah.css` (semua token), `fonts/` dan `fonts.css`, `screenshots/`. Buka langsung dari folder. Tema: tombol bulan/matahari, atau `?theme=dark`.
Data contoh buatan (proyek `tryouthub`, flow build, status campuran), konsisten antar layar; bukan data nyata.

Yang berfungsi: ganti tema, klik node (panel berganti, node terpilih diberi outline ink), rel dan tombol "Lihat percakapan/backlog", tab panel, zoom dan Pas layar (mode node ringkas otomatis), Esc, menu Lainnya (Reset run dua langkah; Laporan teks hanya menutup menu), tombol "Ringkasan" membuka `ringkasan.html`, "Tutup" kembali ke Live. Riwayat dan "Buka Riwayat" nonaktif (Tahap B). Tab File, Skill, Token, Log berisi "dirancang di Tahap B".

## Perbaikan dari review ui-critic (semua diterapkan)
1. Kotak Butuh input: latar warn-soft, garis kiri 4 px, pertanyaan serif 24 px; Gagal terpisah (bad-soft, tepi bad); label "Butuh input 2 · Gagal 1"; angka KPI 32 px.
2. Node ringkas bila zoom < 100%; 14 node di 1440 dan 900.
3. Node terpilih: outline 3 px ink offset 3 px; Berjalan punya warna sendiri (teal).
4. Sel Siapa kerja: judul serif 28 px, "Menunggu kamu: jawab pertanyaan".
5. Lencana rel netral, warn hanya Percakapan dan Backlog.
6. 900 px: konteks pertanyaan dan "Jawab di aplikasi Claude." tampil, "Tersambung" berlabel teks, panel mendorong grafik.
7. Ringkasan: strip hanya "Butuh input 2", tombol "Buka Riwayat" + "Tutup", tombol "Ringkasan" di sel Siapa kerja, menu Lainnya.
8. Pilihan jawaban: daftar bernomor tanpa bingkai.
9. Copy: "Butuh input 2 · Gagal 1", durasi "14 mnt 32 dtk", satu istilah Butuh input.

## Ukuran teks efektif node (Playwright, tinggi viewport 900)
| Lebar | Mode | Skala | Zoom label | Teks node terkecil |
|---|---|---|---|---|
| 1440 | ringkas, 14 node muat | 1,02 | 85% | 14,3 px |
| 900 (panel tertutup) | ringkas, 14 node muat | 0,90 | 75% | 12,6 px |

## Audit ui-craft (`--lang id`, tinggi / sedang / rendah)
| Layar | Tema | 900 px | 1440 px |
|---|---|---|---|
| live.html | terang | 0 / 0 / 2 | 0 / 0 / 3 |
| live.html | gelap | 0 / 0 / 2 | 0 / 0 / 3 |
| ringkasan.html | terang | 0 / 0 / 0 | 0 / 0 / 0 |
| ringkasan.html | gelap | 0 / 0 / 0 | 0 / 0 / 0 |

Temuan rendah: `copy-ulang` (aktivitas agent tampil di sel Siapa kerja dan di node, disengaja) dan jumlah warna latar. Pelanggaran disengaja lain: lihat DESIGN.md bagian 7.

## Screenshot
`screenshots/<layar>-<tema>-<lebar>.png` untuk `live` dan `ringkasan` (terang/gelap, 1440/900), ditambah `live-light-900-open.png` (panel terbuka mendorong grafik) dan `live-light-1440-menu.png` (menu Lainnya).
