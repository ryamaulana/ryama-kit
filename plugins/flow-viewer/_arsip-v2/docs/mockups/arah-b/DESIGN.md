# DESIGN.md · Arah B "Peta jalur"

> Salah satu dari tiga arah (mode konsep-3, 2026-11-04). Belum ada HTML; layar pembanding: Live 1440.
> Data dan token arah ini hanya berlaku bila pemilik memilih arah B.

Status: Draft (konsep, menunggu pemilik memilih arah)
Token mesin: `docs/mockups/arah-b/tokens.css` (saat dipilih: dipindah ke `docs/design-tokens.css`)

## Kesan (3 kata dari pemilik)
Tenang & fokus · Hidup & berenergi · Rapi & editorial (kutipan brief pemilik, bukan asumsi).
Tidak disukai: tampilan generik/template, kartu tipis info sedikit, neon/gelap berlebihan, terlalu ramai.

| Kesan | Cara arah B menjawabnya |
|---|---|
| Tenang & fokus | Abu-biru sejuk dan jalur netral; satu-satunya warna terang adalah sinyal kuning saat kerja menunggu pemilik; bila normal, layar hampir monokrom |
| Hidup & berenergi | Kerja terlihat bergerak: segmen jalur yang sudah dilalui terisi warna, penanda posisi berjalan di garis aktif, papan keberangkatan berganti baris saat agent berganti |
| Rapi & editorial | Huruf rambu semi-sempit dengan skala tegas, semua stasiun sejajar pada jalur lurus 45/90 derajat, label rata pada garis dasar yang sama |

## Konsep (1 kalimat)
Flow Viewer terasa seperti **peta jalur dan papan keberangkatan stasiun**, karena pemilik mengikuti kerja yang bergerak dari agent ke agent dan perlu tahu kerja ada di stasiun mana dan apakah ada yang tertahan; ini terlihat dari flow yang digambar sebagai jalur dengan stasiun bulat dan segmen terlalui berwarna, pita indikator berbentuk papan keberangkatan berhuruf rambu semi-sempit, dan sinyal kuning yang hanya menyala saat kerja menunggu pemilik.

Alasan konsep untuk produk ini: flows.json memang urutan langkah (jalur), agent paralel memang cabang, Agent diam memang "tertahan di stasiun", dan Progres memang posisi di sepanjang jalur.

## Referensi
Pemilik: "Bebas, desainer yang cari". Tidak ada file; referensi berikut adalah genre, bukan merek.

| Referensi | Prinsip yang diambil | Yang TIDAK diambil |
|---|---|---|
| Diagram jalur kereta skematik | Garis hanya 0/45/90 derajat; jarak antar stasiun seragam, bukan jarak nyata; cabang terlihat sebagai pemisahan garis | Palet warna per jalur kota tertentu, lingkaran putih berbingkai khas sistem tertentu, logo |
| Papan keberangkatan stasiun | Satu baris = satu jawaban (tujuan, jam, peron); huruf semi-sempit terbaca dari jauh; kolom angka rata | Huruf LED titik-titik, latar hitam penuh, efek papan putar |

## Dial per jenis area (1-10; antislop 1-3)
Proyek ini hanya punya layar dashboard (UX §3).

| Jenis | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | antislop ENERGY / RHYTHM / MOTION | Alasan singkat |
|---|---|---|---|---|---|
| Layar tugas | - | - | - | - | Tidak ada di proyek ini |
| Dashboard pantau (Live, Daftar proyek, Run lama) | 5 | 4 | 7 | 2 / 2 / 2 | Peta memberi energi lewat gerak kerja nyata; padat karena 12 agent harus muat |
| Dashboard telusur (Detail agent, Backlog, Riwayat, Laporan token, Ringkasan run) | 3 | 2 | 8 | 1 / 1 / 1 | Papan jadwal: baris seragam dan rata adalah kesengajaan, bukan kebetulan |
| Pemasaran | - | - | - | - | Tidak ada (UX §7) |

Design Read: dashboard pemantau lokal untuk satu pemilik, bahasa visual peta transit + papan keberangkatan, dial 2/2/2 (pantau).

## Rancangan layar

### Live (tampilan proyek), 1440 x 900, panel samping terbuka 400 px
- Jenis: dashboard pantau. Pertanyaan: "Apakah saya perlu pindah ke Claude sekarang, dan bila tidak, apakah kerja berjalan normal?"
- Titik fokus: baris pertama sel Siapa kerja di papan (semi-sempit 26 tebal, dengan kotak sinyal kuning saat butuh input) karena itulah jawaban "perlu pindah?"; saat normal, fokus turun ke stasiun yang sedang berjalan di peta.
- Urutan baca: 1. baris pertama papan ("Butuh input: jawab di Claude") 2. kotak pemberitahuan (pengumuman peron) 3. stasiun bertanda di peta, lalu sel Progres dan Token.
- Blok atas ke bawah: bilah atas 44 px (nama proyek + pengalih, Live | Riwayat, bunyi, tema) · papan keberangkatan menempel, satu bilah --surface-sunk dengan tiga sel dipisah garis: Siapa kerja 50% (baris jawaban + hingga dua baris "ux · Menulis docs/UX.md", "+1 lainnya"), Progres 25% ("12%" + rel mini dengan penanda posisi + "Backlog 9 dari 77 item · 42 mnt"), Token 25% ("1,84 jt setara", "+18%", tanda Boros) (F3) · kotak pemberitahuan: bilah sinyal kuning penuh setinggi isi, teks gelap, pertanyaan lengkap + pilihan sebagai daftar sebaris + "Jawab di aplikasi Claude." + "Lihat percakapan" (F5) · peta: jalur horizontal kiri ke kanan, stasiun bulat 20 px di garis 4 px, label kartu 220 px di bawah stasiun (nama, status ikon + teks, aktivitas, cuplikan hasil 2 baris, token · durasi · model); agent paralel = cabang; Sesi utama = stasiun pusat "Claude" di kiri (F2) · panel 400 px kanan, bayangan satu tingkat (F4).
- Kartu/grafik menjawab: papan menjawab "perlu pindah / siapa / sampai mana / boros"; peta menjawab "di mana kerja sekarang dan siapa tertahan"; rel mini Progres menjawab posisi tanpa kalimat.
- Konsep terlihat di: papan keberangkatan, jalur dan stasiun, segmen terlalui berwarna teal, sinyal kuning, label "Diam 12 mnt" sebagai tanda tertahan di stasiun.
- Sengaja tidak ada: kartu node besar berbayang, warna per agent, latar hitam, efek LED, animasi selain penanda di garis aktif.
- Penyesuaian saat dibangun (2026-11-04, `live.html`): peta 1040 px tidak memuat 7 kolom stasiun berlabel 220 px. Maka: jalur pokok Claude -> backlog di tengah tinggi, lalu bercabang lewat satu rel tegak dengan sudut 45 derajat ke 6 stasiun ujung (flow `run`). Stasiun ujung memakai label di KANAN (336 px, satu baris lebih sedikit), karena tidak ada garis yang lewat di kanannya; Claude dan backlog tetap berlabel di bawah. Agent Menunggu hanya teks satu baris tanpa kartu, supaya yang aktif dan bermasalah lebih berat. Jarak antar jalur 96 px (bukan 168) agar 6 cabang muat tanpa menggulung di 1440 x 900.
- Data contoh: flow `run` (/fullstack-dev:run 5), be bertanya batas simpan Riwayat (Butuh input, terpilih di panel), fe Berjalan, ui-designer Diam 12 mnt, tiga agent Menunggu. Setara Claude 1,22 jt + agent 620 rb = 1,84 jt di papan.

## Wujud arah B di setiap layar (semua dashboard)
- **Live**: seperti rancangan di atas. Normal: papan monokrom, hanya segmen teal bergerak. Masalah: sinyal kuning (Butuh input), stasiun bertanda merah dengan alasan satu baris (Gagal), stasiun bergaris putus (Diam).
- **Detail agent (panel)**: kepala seperti papan nama stasiun (nama besar semi-sempit, status di kanan); peringatan sebagai baris pengumuman berlambang; tiga angka sebagai baris papan (durasi | setara | putaran); rincian berupa daftar berjudul dengan garis pemisah, Langkah kerja tampil sebagai jalur vertikal kecil (tool call = titik).
- **Backlog (panel)**: tiap bagian produk = satu jalur pendek horizontal berisi titik item (selesai terisi, siap kosong, gagal merah); kepala bagian: nama + keadaan + "4 dari 9 item"; buka bagian untuk daftar item.
- **Riwayat + Laporan token**: Riwayat sebagai papan jadwal: baris run seragam (judul, waktu, flow, setara + selisih, durasi, aksi), tren 12 run sebagai garis langkah; Laporan token: dialog dengan tiga penyumbang terbesar sebagai baris papan berbatang porsi.
- **Daftar proyek, Ringkasan run**: Daftar proyek sebagai papan keberangkatan per proyek (keadaan di kolom kanan, yang butuh kamu di atas). Ringkasan run sebagai peta jalur yang sudah selesai: stasiun selesai, dilewati (berlubang), gagal (merah), dengan keputusan tersisa di atas.

## Warna
Sejuk dan netral; warna hanya untuk keadaan. Teal = kerja bergerak, kuning sinyal = butuh kamu.

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| --bg | #EEF1F3 | #151D24 | latar peta |
| --surface | #FFFFFF | #1C262F | label stasiun, panel |
| --surface-sunk | #E3E8EC | #111820 | papan keberangkatan |
| --text | #14212B | #E6EDF2 | teks utama |
| --text-muted | #4A5866 | #A7B4BF | teks sekunder |
| --text-faint | #5F6D7A | #8796A3 | keterangan (≥4.5:1) |
| --line | #C9D1D8 | #2C3944 | garis pemisah |
| --track | #6F7D8A | #6E7F8E | jalur belum dilalui (≥3:1) |
| --accent | #1B4F8A | #7FB2E8 | tautan, fokus, stasiun terpilih |
| --st-run | #0A7064 | #4CC3B3 | Berjalan, segmen terlalui |
| --st-input | #F2A93B (isi, teks --text) | #F2A93B (isi, teks #14212B) | Butuh input: sinyal |
| --st-fail | #B42318 | #F28B82 | Gagal |
| --st-warn | #7A5B00 | #E5BF5A | Diam, Boros (garis, bukan isi) |
| --st-idle | #5F6D7A | #8796A3 | Menunggu, Dilewati, Selesai |

## Tipografi
- Satu keluarga: **Barlow** (teks, angka) dan **Barlow Semi Condensed** (papan, nama stasiun, judul). OFL. Alasan: dirancang dari huruf rambu jalan, jadi konsep "rambu dan papan" ada di hurufnya sendiri; semi-sempit memuat nama agent panjang di label 220 px.
- Mono: sistem (`ui-monospace, Consolas`) hanya untuk path file dan perintah tool, 13 px.
- Skala: 12 / 13 / 14 / 16 / 20 / 26 / 32. Line-height isi 1.45, judul 1.1. Angka tabular di papan dan tabel. Tidak ada kapital bertracking lebar; label papan memakai huruf biasa.
- Font di-host sendiri (woff2, tanpa CDN).

## Spacing & layout
- Unit 4; skala 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Papan tinggi ±96 px, menempel. Panel 400 px (≥1200), 340 px (900-1199).
- Peta: jarak antar stasiun 248 px, jarak antar jalur paralel 168 px; garis hanya 0/45/90 derajat.

## Bentuk
- Radius: 6 (chip, label), 10 (panel, dialog), lingkaran penuh hanya untuk stasiun dan titik item.
- Bayangan: satu tingkat (panel samping, dialog, menu): `0 6px 20px` tipis. Label stasiun datar dengan garis 1 px.
- Garis jalur 4 px; garis pemisah 1 px.

## Komponen
- Tombol: utama = isi --text, teks putih; sekunder = garis 1 px; ghost = teks --accent.
- Stasiun: lingkaran 20 px; isi menurut status + ikon di dalam (centang, jeda, silang, tanda tanya); terpilih = cincin 3 px --accent.
- Label stasiun: kartu 220 px datar, kepala = nama semi-sempit 16 + status teks; tidak ada garis warna kiri.
- Tab rel: ikon + teks pendek; lencana hanya angka tindakan (UX §5).
- Tabel/papan: baris 40 px, kolom angka rata kanan tabular, garis bawah tipis.
- Empty/memuat/galat: jalur abu tanpa stasiun aktif + "Belum ada run. Kirim prompt di Claude untuk mulai."

## Motion
- Durasi 140 ms (mikro), 280 ms (segmen terisi, panel). Easing ease-out.
- Dianimasikan: segmen jalur terisi saat agent selesai; penanda posisi bergeser pelan di garis aktif (hanya selama agent benar-benar Berjalan, menandai keadaan nyata); baris papan berganti dengan geser 4 px + opacity.
- Tidak dianimasikan: denyut stasiun, glow, efek papan putar. `prefers-reduced-motion`: penanda diam, segmen langsung terisi.

## Istilah & nada (maks 10 baris)
- Bahasa UI: id, sapaan "kamu", kalimat pendek.
- Istilah dari UX §6/§10: Butuh input, Gagal, Diam <n> mnt, Boros, setara, pembanding, Sesi utama, run, bagian.
- Metafora transit hanya pada bentuk; teks tidak memakai "stasiun", "kereta", "peron". Pemilik membaca "agent", bukan istilah kereta.
- Baris jawaban papan: "Butuh input: jawab di Claude", "1 agent gagal", "2 agent berjalan", "Tidak ada agent yang berjalan".
- Data token belum ada: "menunggu data".

## Larangan khusus arah ini
- Tidak ada warna berbeda per agent atau per jalur (warna hanya status).
- Tidak ada latar hitam penuh atau huruf LED.
- Kuning sinyal hanya untuk Butuh input.

## Pelanggaran disengaja
| Temuan audit | Di mana | Alasan |
|---|---|---|
| keluarga-huruf: 3 (Barlow, Barlow Semi Condensed, mono) | path file dan perintah di papan, label, panel | Mono sistem hanya untuk path file dan perintah tool (lihat Tipografi); Barlow + Semi Condensed satu keluarga desain |
| titik-fokus: 7 tombol berlatar solid | label stasiun di peta | Label stasiun adalah tombol pembuka detail (kartu --surface), bukan aksi; viewer read-only tidak punya aksi utama |
| copy-ulang: pertanyaan muncul dua kali | kotak pemberitahuan + detail be | UX §6.1/§6.2: kotak memuat teks lengkap; detail agent wajib menampilkan pertanyaan yang menunggu di atas |
| gerak berulang > 5 detik | penanda di cabang fe | Menandai keadaan nyata (agent Berjalan), berhenti saat agent berhenti; diam di prefers-reduced-motion |
| kandidat fokus kedua: nama agent "be" 26 px di panel | kepala detail agent | Kepala papan nama stasiun; kata pendek, di panel kanan, tidak merebut baris jawaban papan (uji screenshot) |

### Catatan build Live (2026-11-04)
Mockup: `docs/mockups/arah-b/live.html` (1440 x 900, terang; tombol Tema gelap berfungsi). Screenshot + audit: `docs/mockups/arah-b/screenshots/`. Font Barlow di-host di `fonts/`.

## Decision log
| Tanggal | Perubahan | Alasan |
|---|---|---|
| 2026-11-04 | Arah B ditulis (konsep-3) | Pilihan arah oleh pemilik |
