# Arah B: Navy padat

**Ide satu kalimat:** Ruang kendali gelap-navy yang rapat: rel navigasi di kiri, instrumen tiga angka dengan grafik, dan linimasa Gantt di bawah grafik sehingga yang berjalan paralel langsung terbaca.

Berkas: `live.html` (tampilan proyek live), `ringkasan.html` (ringkasan akhir run, F6), `arah.css` (semua token sebagai variabel), `fonts/` dan `fonts.css` (huruf tertanam, jalan tanpa jaringan), `screenshots/`.
Buka langsung dari folder (tanpa build). Tema: tombol bulan/matahari di bilah, atau tambahkan `?theme=dark` ke alamat. Data mockup sama di ketiga arah (proyek `tryouthub`, flow build, 10 agent, status campuran); angka konsisten antar layar.
Yang berfungsi di mockup: ganti tema, klik node (panel berganti ke agent itu), tab panel, tombol data proyek (Percakapan dan Backlog digambar; Skill, File, Token, Log berisi "dirancang di Tahap B"), zoom dan Pas layar, Esc menutup panel, tombol bunyi dan notifikasi (hanya keadaan tombol), tautan ke layar satunya. Riwayat sengaja nonaktif (Tahap B).

## Perbedaan utama
- Struktur: rel navigasi dan data proyek di kiri (tanpa bilah atas), strip instrumen satu panel dengan sekat, pita pemberitahuan penuh, grafik dengan linimasa agent di bawahnya, panel detail menempel rata di kanan.
- Huruf: IBM Plex Sans dengan IBM Plex Sans Condensed untuk angka dan label.
- Suhu: gelap-navy dingin (default), terang biru-abu dingin.
- Kepadatan: tinggi; node 216x104, dua belas node dan enam batang linimasa dalam satu layar.
- Grafis: grafik area dan batang, linimasa, mini-bar token per node, konektor tipis.
- Bentuk: radius sedang (6/10/14), tepi 1 px, tanpa bayangan saat diam.

## Token

**Huruf.** IBM Plex Sans (400, 500, 600) untuk teks; IBM Plex Sans Condensed (500, 600) untuk angka, label, dan metrik. Alasan: keluarga rekayasa dengan angka tegas dan versi sempit yang memuat metrik rapat di kartu kecil.

**Skala huruf (px).** 12 · 13 · 14 · 16 · 20 · 36. Enam ukuran saja; angka indikator 36 kondensed.

**Skala spasi (px, kelipatan 4 dengan 2 dan 6).** 2 · 4 · 6 · 8 · 12 · 16. Jarak dalam kartu 2 sampai 8, antar panel 12.

**Radius.** 6 (chip, tombol, bar), 10 (node, ubin, tab rel), 14 (panel). Batang kecil memakai 2 sampai 4.

**Bayangan.** Tidak ada bayangan pada elemen diam (pemisah memakai garis 1 px dan selisih tone). Dua bayangan hanya untuk yang mengambang: panel overlay pada 900 px (s1) dan cincin 3 px untuk node terpilih.

**Palet.** Aksen hanya satu (biru #0B4FD1 terang, #6FAEFF gelap); hijau, amber, dan merah hanya untuk status dan selalu berpasangan dengan ikon dan teks.

| Peran | Terang | Gelap |
|---|---|---|
| latar halaman | `#E9EEF6` | `#0A1020` |
| permukaan kartu | `#FFFFFF` | `#111A2E` |
| permukaan kedua | `#F1F5FB` | `#16213A` |
| garis kartu | `#CFD8E6` | `#26355A` |
| garis konektor | `#7384A0` | `#6B7FA6` |
| teks utama | `#0D1626` | `#EAF0FB` |
| teks sekunder | `#38465E` | `#B9C6DE` |
| teks redup | `#4D5C76` | `#9CAACB` |
| aksen (aksi, berjalan) | `#0B4FD1` | `#6FAEFF` |
| teks di atas aksen | `#FFFFFF` | `#06142E` |
| aksen lembut | `#E0EBFF` | `#173063` |
| selesai | `#0F6B3F` | `#5FDCA0` |
| selesai lembut | `#DDF3E7` | `#0E3022` |
| butuh input | `#8A4A00` | `#FFC266` |
| butuh input lembut | `#FFEBC8` | `#3A2808` |
| gagal | `#B3261E` | `#FF9A93` |
| gagal lembut | `#FDE4E1` | `#431B1E` |

**Rasio kontras (WCAG AA: teks 4,5:1, garis grafis 3:1).**

| Pasangan | Terang | Gelap |
|---|---|---|
| ink / surface | 18.11:1 | 15.16:1 |
| ink2 / surface | 9.52:1 | 10.07:1 |
| ink3 / surface | 6.76:1 | 7.45:1 |
| ink3 / ground | 5.80:1 | 8.15:1 |
| ink3 / surface2 | 6.18:1 | 6.88:1 |
| accent / surface | 6.88:1 | 7.58:1 |
| onAccent / accent | 6.88:1 | 8.00:1 |
| accent / accentSoft | 5.73:1 | 5.60:1 |
| ok / okSoft | 5.65:1 | 8.35:1 |
| warn / warnSoft | 5.87:1 | 8.85:1 |
| bad / badSoft | 5.40:1 | 7.28:1 |
| ink2 / surface2 | 8.70:1 | 9.29:1 |
| edge / ground (garis, bukan teks) | 3.26:1 | 4.70:1 |

## Status node (warna dan ikon dan teks)
- Berjalan: border biru 2 px, ikon putaran, teks "Berjalan", batang linimasa biru.
- Selesai: ikon centang, teks "Selesai", batang hijau.
- Butuh input: border amber putus-putus, ikon tanya, teks "Butuh input", pita amber di atas grafik.
- Gagal: border merah putus-putus, ikon silang, teks "Gagal", batang merah.
- Dilewati: permukaan lebih gelap, ikon panah ganda, teks "Dilewati".
- Menunggu: border tipis, ikon jam, teks "Menunggu".

## Pelanggaran disengaja
- Teks node 12 px kondensed; pada 1440x900 grafik dipas sekitar 83% (efektif sekitar 10 px). Pada 900 px linimasa disembunyikan agar grafik mencapai sekitar 83%.
- `copy-ulang` dan `warna-latar` (rendah): aktivitas agent sama di strip dan node; 13 warna latar karena enam status dan dua permukaan memakai tint tersendiri.
- Garis 1 px antar sel strip dan antar baris tabel dipakai sengaja karena ini arah paling padat (tabel dan sekat, bukan dekorasi).

## Usulan perubahan terhadap UX.md (perlu keputusan pemilik bila arah ini dipilih)
- Navigasi Live/Riwayat, bunyi, notifikasi, tema, dan tab data pindah ke rel kiri; bilah atas hanya memuat nama proyek, flow, dan koneksi (UX: bilah atas berisi semuanya).
- Linimasa agent (UX: ada di tab Log) ditampilkan permanen di bawah grafik pada 1200 px ke atas. Pada 900 px disembunyikan dan tetap ada di tab Log.
- Panel samping default tertutup di 900 sampai 1199 px dan jadi overlay.

## Audit ui-craft (`--lang id`, format: tinggi / sedang / rendah)

| Layar | Tema | 900 px | 1440 px |
|---|---|---|---|
| live.html | terang | 0 / 0 / 2 | 0 / 0 / 4 |
| live.html | gelap | 0 / 0 / 2 | 0 / 0 / 4 |
| ringkasan.html | terang | 0 / 0 / 0 | 0 / 0 / 0 |
| ringkasan.html | gelap | 0 / 0 / 0 | 0 / 0 / 0 |

Tidak ada temuan tinggi atau sedang. Temuan rendah yang tersisa: `copy-ulang` (aktivitas yang sama di strip dan node, disengaja) dan `warna-latar` (13 tint, disengaja).

## Screenshot
`screenshots/` berisi `live` dan `ringkasan` untuk tema `light` dan `dark`, lebar 1440 dan 900 (`<layar>-<tema>-<lebar>.png`). Lebar 900 px adalah batas bawah PRD; panel samping default tertutup di lebar itu (lihat usulan di atas).
