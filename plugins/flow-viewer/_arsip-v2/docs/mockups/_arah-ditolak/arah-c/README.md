# Arah C: Tinta

**Ide satu kalimat:** Kertas putih dan tinta hitam: satu kolom kiri berisi tiga angka sangat besar dan pertanyaan yang harus kamu jawab, grafik berbentuk lajur per fase, dan status berupa blok solid yang tidak mungkin terlewat.

Berkas: `live.html` (tampilan proyek live), `ringkasan.html` (ringkasan akhir run, F6), `arah.css` (semua token sebagai variabel), `fonts/` dan `fonts.css` (huruf tertanam, jalan tanpa jaringan), `screenshots/`.
Buka langsung dari folder (tanpa build). Tema: tombol bulan/matahari di bilah, atau tambahkan `?theme=dark` ke alamat. Data mockup sama di ketiga arah (proyek `tryouthub`, flow build, 10 agent, status campuran); angka konsisten antar layar.
Yang berfungsi di mockup: ganti tema, klik node (panel berganti ke agent itu), tab panel, tombol data proyek (Percakapan dan Backlog digambar; Skill, File, Token, Log berisi "dirancang di Tahap B"), zoom dan Pas layar, Esc menutup panel, tombol bunyi dan notifikasi (hanya keadaan tombol), tautan ke layar satunya. Riwayat sengaja nonaktif (Tahap B).

## Perbedaan utama
- Struktur: bilah atas hitam terbalik, kolom kiri tetap (tiga indikator vertikal lalu kotak pemberitahuan), grafik berbentuk lajur horizontal per fase (Masukan, Rencana, Bangun, Periksa), panel kanan dengan tab data 3x2.
- Huruf: satu keluarga, Schibsted Grotesk, bobot 400 sampai 800; kontras datang dari bobot dan ukuran, bukan dari pasangan huruf.
- Suhu: netral murni (putih dan hitam), tanpa kehangatan atau dingin.
- Kepadatan: sedang, tepi tegas 2 px, angka 40 sampai 56 px.
- Grafis: blok segmen (20 blok untuk 20 item backlog), batang perbandingan, konektor siku, titik persegi bergerak.
- Bentuk: sudut kecil (4/8), status berupa blok persegi, bukan pil.

## Token

**Huruf.** Schibsted Grotesk (variabel 400 sampai 800), satu keluarga. Alasan: grotesk gaya redaksi dengan bobot tebal yang tajam, memberi hierarki kuat tanpa pasangan huruf kedua.

**Skala huruf (px).** 12 · 13 · 14 · 16 · 20 · 28 · 40 · 56 (56 hanya di ringkasan).

**Skala spasi (px, kelipatan 4 dengan 2 dan 6).** 2 · 4 · 6 · 8 · 12 · 16 · 20; pengecualian 1 dan 10 di dalam node dan tile kecil.

**Radius.** 8 (tile, node, panel), 4 (chip status, tombol, chip pilihan), 2 (blok segmen dan batang).

**Bayangan.** Tidak ada bayangan lembut. Satu bayangan keras berukuran 4 px dengan warna aksen untuk node terpilih dan tombol hover, dan satu bayangan keras hitam 8 px untuk panel overlay pada 900 px.

**Palet.** Aksen hanya satu (biru #0A3CFF terang, #7A9BFF gelap; tombol dan tab aktif memakai tinta (hitam/putih), biru hanya untuk "berjalan"); hijau, amber, dan merah hanya untuk status dan selalu berpasangan dengan ikon dan teks.

| Peran | Terang | Gelap |
|---|---|---|
| latar halaman | `#FFFFFF` | `#0B0B0C` |
| permukaan kartu | `#FFFFFF` | `#141416` |
| permukaan kedua | `#F2F2F0` | `#1D1D20` |
| garis kartu | `#111111` | `#F2F2F2` |
| garis konektor | `#111111` | `#F2F2F2` |
| teks utama | `#0A0A0A` | `#FFFFFF` |
| teks sekunder | `#2E2E2E` | `#E2E2E4` |
| teks redup | `#4A4A4A` | `#BDBDC2` |
| aksen (aksi, berjalan) | `#0A3CFF` | `#7A9BFF` |
| teks di atas aksen | `#FFFFFF` | `#050A24` |
| aksen lembut | `#E3EAFF` | `#1C2A66` |
| selesai | `#0B5F35` | `#6EE0A5` |
| selesai lembut | `#D7F1E2` | `#0F3322` |
| butuh input | `#7A4300` | `#FFC766` |
| butuh input lembut | `#FFE7B8` | `#3A2807` |
| gagal | `#A3160F` | `#FF9F97` |
| gagal lembut | `#FFDAD6` | `#451A18` |

**Rasio kontras (WCAG AA: teks 4,5:1, garis grafis 3:1).**

| Pasangan | Terang | Gelap |
|---|---|---|
| ink / surface | 19.80:1 | 18.40:1 |
| ink2 / surface | 13.58:1 | 14.22:1 |
| ink3 / surface | 8.86:1 | 9.83:1 |
| ink3 / ground | 8.86:1 | 10.51:1 |
| ink3 / surface2 | 7.91:1 | 8.99:1 |
| accent / surface | 6.77:1 | 6.97:1 |
| onAccent / accent | 6.77:1 | 7.40:1 |
| accent / accentSoft | 5.63:1 | 5.06:1 |
| ok / okSoft | 6.50:1 | 8.48:1 |
| warn / warnSoft | 6.61:1 | 9.16:1 |
| bad / badSoft | 6.07:1 | 7.54:1 |
| ink2 / surface2 | 12.11:1 | 13.00:1 |
| edge / ground (garis, bukan teks) | 18.88:1 | 17.57:1 |

## Status node (warna dan ikon dan teks)
- Berjalan: blok biru solid, ikon putaran, teks "Berjalan", border node biru 3 px, konektor biru tebal dengan titik persegi bergerak.
- Selesai: blok hijau solid, ikon centang, teks "Selesai".
- Butuh input: blok amber solid, ikon tanya, teks "Butuh input", node berborder putus-putus 3 px.
- Gagal: blok merah solid, ikon silang, teks "Gagal", node berborder putus-putus merah.
- Dilewati: blok abu solid, ikon panah ganda, teks "Dilewati".
- Menunggu: blok kosong berborder, ikon jam, teks "Menunggu", node berborder titik-titik.

## Pelanggaran disengaja
- Teks node 12 px; pada 1440x900 grafik dipas sekitar 83% (efektif sekitar 10 px), pada 900 px sekitar 65% karena lajur membuat grafik tinggi. Ini kelemahan arah ini di lebar bawah.
- Angka 56 px (ringkasan) dan 40 px (indikator) sengaja di luar skala isi.
- `copy-ulang` (rendah): aktivitas agent sama di indikator dan node.
- Item Riwayat bergaris putus-putus (nonaktif, Tahap B).

## Usulan perubahan terhadap UX.md (perlu keputusan pemilik bila arah ini dipilih)
- Pita tiga indikator jadi kolom vertikal kiri pada 1200 px ke atas dan kembali jadi pita satu baris pada 900 sampai 1199 px (UX: pita satu baris di mana pun). Kotak pemberitahuan tetap tepat di bawah tiga angka.
- Grafik berbentuk lajur per fase dengan konektor siku, bukan kolom kiri ke kanan.
- Tab data proyek jadi grid 3x2 di atas panel; menutup detail kembali ke tab Percakapan (panel tidak menciut) pada 1200 px ke atas.
- Panel samping default tertutup di 900 sampai 1199 px dan dibuka dari tombol panel di bilah atas.

## Audit ui-craft (`--lang id`, format: tinggi / sedang / rendah)

| Layar | Tema | 900 px | 1440 px |
|---|---|---|---|
| live.html | terang | 0 / 0 / 2 | 0 / 0 / 3 |
| live.html | gelap | 0 / 0 / 2 | 0 / 0 / 3 |
| ringkasan.html | terang | 0 / 0 / 0 | 0 / 0 / 0 |
| ringkasan.html | gelap | 0 / 0 / 0 | 0 / 0 / 0 |

Tidak ada temuan tinggi atau sedang. Temuan rendah yang tersisa: `copy-ulang` (disengaja, lihat di atas).

## Screenshot
`screenshots/` berisi `live` dan `ringkasan` untuk tema `light` dan `dark`, lebar 1440 dan 900 (`<layar>-<tema>-<lebar>.png`). Lebar 900 px adalah batas bawah PRD; panel samping default tertutup di lebar itu (lihat usulan di atas).
