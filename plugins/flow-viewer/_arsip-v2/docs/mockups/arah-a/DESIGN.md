# DESIGN.md · Arah A "Halaman depan"

> Salah satu dari tiga arah (mode konsep-3, 2026-11-04). HTML: `live.html` (layar pembanding Live 1440).
> Data dan token arah ini hanya berlaku bila pemilik memilih arah A.

Status: Draft (konsep, menunggu pemilik memilih arah)
Token mesin: `docs/mockups/arah-a/tokens.css` (saat dipilih: dipindah ke `docs/design-tokens.css`)

## Kesan (3 kata dari pemilik)
Tenang & fokus · Hidup & berenergi · Rapi & editorial (kutipan brief pemilik, bukan asumsi).
Tidak disukai: tampilan generik/template, kartu tipis info sedikit, neon/gelap berlebihan, terlalu ramai.

| Kesan | Cara arah A menjawabnya |
|---|---|
| Tenang & fokus | Kertas hangat, tanpa bayangan, hanya garis tipis; satu kalimat jawaban berukuran terbesar di layar, semua lain tunduk padanya |
| Hidup & berenergi | Kalimat jawaban berganti saat keadaan berubah (transisi silang 200 ms), garis penghubung aktif menebal dan mengisi, angka token dan durasi berdetak per detik |
| Rapi & editorial | Huruf serif untuk "berita" (jawaban, cuplikan hasil), sans untuk data; grafik disusun berkolom fase dengan garis pembatas seperti kolom koran |

## Konsep (1 kalimat)
Flow Viewer terasa seperti **halaman depan koran yang dicetak ulang tiap detik**, karena pemilik memantau satu run dan hanya perlu tahu "berita utamanya" (perlu pindah ke Claude atau tidak); ini terlihat dari kalimat jawaban berhuruf serif besar di kepala pita, grafik yang disusun sebagai kolom fase berpembatas garis, dan cuplikan hasil agent yang tampil sebagai kutipan.

## Referensi
Pemilik: "Bebas, desainer yang cari". Tidak ada file; referensi berikut adalah genre, bukan merek.

| Referensi | Prinsip yang diambil | Yang TIDAK diambil |
|---|---|---|
| Halaman depan surat kabar harian | Satu judul utama menentukan hierarki; kolom dibatasi garis (rule), bukan kotak; teks kecil rapat tapi teratur | Ornamen masthead gotik, nama koran, tanggal edisi dekoratif, kolom berita sempit di layar lebar |
| Lembar hasil pertandingan di koran (box score) | Angka padat dalam tabel bergaris tipis, terbaca sekilas karena rata kanan dan tabular | Singkatan yang tidak dipahami pemilik |

## Dial per jenis area (1-10; antislop 1-3)
Proyek ini hanya punya layar dashboard (UX §3). Dashboard dibagi dua karena perilakunya beda: dipantau sambil lalu vs ditelusuri sengaja.

| Jenis | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | antislop ENERGY / RHYTHM / MOTION | Alasan singkat |
|---|---|---|---|---|---|
| Layar tugas | - | - | - | - | Tidak ada di proyek ini |
| Dashboard pantau (Live, Daftar proyek, Run lama) | 4 | 3 | 6 | 2 / 2 / 2 | Satu judul besar memberi energi; gerak hanya untuk perubahan keadaan nyata |
| Dashboard telusur (Detail agent, Backlog, Riwayat, Laporan token, Ringkasan run) | 3 | 2 | 7 | 1 / 2 / 1 | Dibaca lama; kepadatan tabel koran, tanpa gerak selain hover dan lipat |
| Pemasaran | - | - | - | - | Tidak ada (UX §7) |

Design Read: dashboard pemantau lokal untuk satu pemilik teknis-bisnis, bahasa visual koran harian (kertas, serif, garis), dial 2/2/2 (pantau).

## Rancangan layar

### Live (tampilan proyek), 1440 x 900, panel samping terbuka 400 px
- Jenis: dashboard pantau. Pertanyaan: "Apakah saya perlu pindah ke Claude sekarang, dan bila tidak, apakah kerja berjalan normal?"
- Titik fokus: kalimat jawaban di sel Siapa kerja (serif 34, satu-satunya teks sebesar itu) karena kalimat itulah jawaban pertanyaan layar.
- Urutan baca: 1. kalimat jawaban ("Butuh input: jawab di Claude") 2. kotak pemberitahuan berisi pertanyaan lengkap 3. node bertanda di grafik, lalu Progres dan Token.
- Blok atas ke bawah: bilah atas 48 px (nama proyek + pengalih, Live | Riwayat, bunyi, tema; tempat) · pita 2 tingkat menempel: kiri 56% sel Siapa kerja (kalimat serif + baris sans nama/aktivitas), kanan dua kolom dipisah garis tegak: Progres ("12%" serif 34 kecil-tebal, "Backlog 9 dari 77 item · 42 mnt") dan Token ("1,84 jt setara", "+18% dari pembanding", tanda Boros) (F3, jawaban di atas) · kotak pemberitahuan lebar penuh, garis ganda di atas, latar tint vermilion halus, pertanyaan serif 18 + pilihan bernomor + "Jawab di aplikasi Claude." + "Lihat percakapan" (F5, teks terbaca tanpa klik) · grafik: kolom per fase dari flows.json, kepala kolom kecil, garis tegak tipis antar kolom; node 232 px berisi nama, status (ikon + teks), aktivitas, cuplikan hasil 2 baris serif miring, baris angka token · durasi · model (F2, kartu tidak tipis) · panel 400 px kanan dengan rel tab, dipisah garis, tanpa bayangan (F4).
- Kartu/grafik menjawab: sel Siapa kerja menjawab "perlu pindah?"; Progres menjawab "sampai mana"; Token menjawab "boros tidak"; grafik menjawab "agent mana bermasalah"; tidak ada kartu angka tanpa pertanyaan.
- Konsep terlihat di: kalimat jawaban sebagai judul utama, kolom fase bergaris, cuplikan hasil sebagai kutipan, angka node seperti box score.
- Sengaja tidak ada: deretan kartu KPI, bayangan, grid latar, ikon dekoratif, tabel token per agent di pita (hanya di tab Token, UX §6.1).

## Wujud arah A di setiap layar (semua dashboard)
- **Live**: seperti rancangan di atas. Keadaan normal: kalimat jawaban hitam ("2 agent berjalan"); masalah: kalimat berwarna status + ikon, garis ganda kotak pemberitahuan menjadi penanda edisi khusus.
- **Detail agent (panel)**: dibuka seperti artikel: nama agent sebagai judul serif 26, status dan peran sebagai dek; peringatan sebagai kotak "ralat" bergaris kiri-kanan; satu kalimat jawaban serif 18; tiga angka sebagai box score satu baris; rincian sebagai subjudul sans tebal dengan garis di atas tiap bagian.
- **Backlog (panel)**: baris jawaban serif sebagai judul; bagian sebagai rubrik (nama bagian + keadaan + "4 dari 9 item"), item sebagai baris bergaris tipis seperti daftar indeks; bagian Selesai terlipat.
- **Riwayat + Laporan token**: Riwayat sebagai "arsip edisi": ringkasan empat angka satu baris, tren 12 run sebagai grafik garis tinta dengan titik pembanding abu, daftar run tabel bergaris tipis rata kanan. Laporan token: dialog berjudul serif, tiga penyumbang terbesar sebagai tiga baris berangka besar dengan batang porsi tipis.
- **Daftar proyek, Ringkasan run**: Daftar proyek seperti daftar isi (nama proyek serif, keadaan di kanan, yang butuh kamu paling atas). Ringkasan run seperti laporan akhir: keputusan tersisa sebagai judul, lalu langkah selesai/dilewati dua kolom.

## Warna
Kertas hangat, tinta hitam-cokelat; status bermasalah hangat, sehat netral (dashboard-design: Quiet).

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| --bg | #F6F3EC | #1A1916 | latar halaman (kertas) |
| --surface | #FFFDF8 | #22201C | node, panel, kotak |
| --surface-sunk | #EEE9DE | #2A2823 | pita, kepala kolom |
| --text | #1D1B17 | #EDE8DD | teks utama |
| --text-muted | #5C574D | #B3AC9D | teks sekunder |
| --text-faint | #6E685B | #958E7F | keterangan kecil (≥4.5:1) |
| --rule | #D9D2C3 | #3A362F | garis pembatas |
| --rule-strong | #1D1B17 | #EDE8DD | garis kepala pita, garis ganda |
| --accent | #2B4C7E | #8FB0E0 | tautan, fokus, node terpilih |
| --st-run | #1F6B5A | #6BC2A8 | Berjalan (garis aktif, ikon) |
| --st-input | #C2410C | #F08A5D | Butuh input (paling kuat) |
| --st-fail | #A3171D | #F07272 | Gagal |
| --st-warn | #8A5A00 | #E0B04A | Diam, Boros, model beda |
| --st-idle | #6E685B | #958E7F | Menunggu, Dilewati, Selesai (ikon + teks) |

## Tipografi
- Font berita (jawaban, judul, cuplikan): **Newsreader** (OFL; serif dengan optical size, dirancang untuk membaca di layar). Alasan: membawa suara "koran" tanpa ornamen.
- Font data (label, angka, node): **Instrument Sans** (OFL; grotesk agak sempit, angka tabular). Alasan: muat padat di node 232 px.
- Mono: sistem (`ui-monospace, Consolas`) hanya untuk path file dan perintah tool, 13 px.
- Skala: 12 / 13 / 14 / 16 / 20 / 26 / 34. Line-height isi 1.5, judul serif 1.15. Judul serif letter-spacing -0.01em; tidak ada huruf kapital bertracking lebar.
- Font di-host sendiri (woff2 di folder public, tanpa CDN: alat lokal, data tetap lokal).

## Spacing & layout
- Unit 4; skala 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Pita tinggi ±112 px (2 tingkat), menempel. Panel 400 px (≥1200), 340 px (900-1199).
- Grafik: kolom fase lebar 264 px, jarak node vertikal 24.

## Bentuk
- Radius: 2 (chip, input), 4 (node, kotak). Tidak ada radius besar.
- Bayangan: tidak ada. Elevasi ditunjukkan garis (dialog Laporan token: garis tebal 2 px + latar redup).
- Garis: 1 px --rule; 2 px --rule-strong untuk kepala pita; garis ganda (1 + 3 + 1) hanya di kotak pemberitahuan.

## Komponen
- Tombol: utama = teks putih di --text (tinta), sekunder = garis 1 px, ghost = tautan bergaris bawah --accent.
- Node: kertas --surface, garis 1 px; terpilih = garis 2 px --accent; status di baris kepala (ikon + teks berwarna status), bukan garis kiri.
- Tab rel: teks + lencana angka hanya bila berarti tindakan (UX §5).
- Tabel: baris 40 px, garis bawah tipis, angka rata kanan tabular.
- Empty/memuat/galat: kalimat serif kecil + aksi, mis. "Belum ada run. Kirim prompt di Claude untuk mulai."

## Motion
- Durasi 160 ms (mikro), 240 ms (kalimat jawaban berganti, panel). Easing ease-out.
- Dianimasikan: transisi silang kalimat jawaban, garis aktif mengisi (stroke-dashoffset satu kali per segmen), angka berdetak tanpa animasi.
- Tidak dianimasikan: denyut tak berujung, node melayang, fade-up saat muat. `prefers-reduced-motion`: semua transisi 0.

## Istilah & nada (maks 10 baris)
- Bahasa UI: id, sapaan "kamu", kalimat pendek tanpa slogan.
- Istilah tetap dari UX §6/§10: Butuh input, Gagal, Diam <n> mnt, Boros, setara, pembanding, Sesi utama, run, bagian.
- Kalimat jawaban selalu dimulai keadaan: "Butuh input: jawab di Claude", "1 agent gagal", "2 agent berjalan", "Tidak ada agent yang berjalan".
- Data token belum ada: "menunggu data", bukan 0.
- Arah koran hanya pada bentuk; teks tetap bahasa alat, bukan gaya judul berita.

## Larangan khusus arah ini
- Tidak ada nama koran, masthead hias, atau huruf gotik.
- Serif tidak dipakai untuk angka tabel atau label kecil.
- Vermilion hanya untuk Butuh input.

## Pelanggaran disengaja
| Temuan audit | Di mana | Alasan |
|---|---|---|
| titik-fokus: 10 tombol berlatar solid | node grafik (`button.node`) | Node adalah kartu data yang bisa diklik untuk membuka detail agent, bukan aksi utama; fokus tetap kalimat jawaban (audit: elemen terkuat = h1.answer) |
| warna-aksen: 4 kelompok warna jenuh | --accent + --st-input/--st-run/--st-warn | Warna status wajib (ikon + teks), bukan dekorasi; aksen hanya node terpilih, fokus, tautan |
| keluarga-huruf: 3 | mono di path file dan perintah tool | Sesuai Tipografi: mono sistem hanya untuk path/perintah |

## Catatan bangun Live 1440 (2026-11-04)
- File: `live.html` (statis, data contoh proyek "kasir-warung"). Screenshot: `screenshots/audit-1440.png`.
- Penyesuaian dari rancangan: Progres dan Token serif 26 (bukan 34) agar kalimat jawaban tetap satu-satunya teks 34; pertanyaan di kotak serif 20 (18 tidak ada di skala); kolom fase dibagi rata (4 x 260 px) karena lebar grafik 1040 px tidak muat 4 x 264; tab panel berupa baris teks di atas panel (rel di dalam 400 px).
- Nama kepala kolom (Mulai, Rencana, Bangun, Periksa) adalah asumsi: flows.json hanya punya nomor kolom.

## Decision log
| Tanggal | Perubahan | Alasan |
|---|---|---|
| 2026-11-04 | Arah A ditulis (konsep-3) | Pilihan arah oleh pemilik |
| 2026-11-04 | Live 1440 dibangun; @font-face ditambah ke tokens.css, font di `fonts/` | Bangun arah A untuk dinilai pemilik |
