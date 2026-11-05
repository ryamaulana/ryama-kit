# DESIGN.md · Arah C "Lembar cetak"

> Salah satu dari tiga arah (mode konsep-3, 2026-11-04). Dibangun: `live.html` (Live, 1440, HTML statis, 2026-11-04); screenshot `screenshots/audit-1440.png`.
> Data dan token arah ini hanya berlaku bila pemilik memilih arah C.

Status: Draft (Live 1440 dibangun, menunggu pemilik memilih arah)
Token mesin: `docs/mockups/arah-c/tokens.css` (saat dipilih: dipindah ke `docs/design-tokens.css`)

## Kesan (3 kata dari pemilik)
Tenang & fokus · Hidup & berenergi · Rapi & editorial (kutipan brief pemilik, bukan asumsi).
Tidak disukai: tampilan generik/template, kartu tipis info sedikit, neon/gelap berlebihan, terlalu ramai.

| Kesan | Cara arah C menjawabnya |
|---|---|
| Tenang & fokus | Kertas putih lega, jarak antar node lebih longgar dari arah lain; hanya tiga tinta, dan saat normal hanya tinta hijau yang muncul |
| Hidup & berenergi | Blok Siapa kerja berganti warna tinta penuh sesuai keadaan; angka besar berhuruf grotesk berkarakter; kepala node berupa pita tinta yang terlihat dari jauh |
| Rapi & editorial | Sudut siku, garis tebal konsisten 2 px, kolom sejajar seperti tata letak poster cetak; tidak ada bayangan lembut atau gradien |

## Konsep (1 kalimat)
Flow Viewer terasa seperti **lembar cetak percobaan di studio cetak saring (risograf)**, karena tiap run memang satu "cetakan" yang menghabiskan tinta (token) dan pemilik memeriksa hasilnya lembar demi lembar; ini terlihat dari tiga tinta datar di atas kertas putih (hijau = berjalan, koral = butuh kamu, mustard = peringatan), sudut siku bergaris tebal, dan blok Siapa kerja yang berganti warna tinta penuh sesuai keadaan.

Alasan konsep untuk produk ini: kata "run" dan "boros tinta" sudah sejajar dengan token setara; Riwayat = arsip cetakan; Laporan token = catatan pemakaian tinta per drum (agent).

## Referensi
Pemilik: "Bebas, desainer yang cari". Tidak ada file; referensi berikut adalah genre, bukan merek.

| Referensi | Prinsip yang diambil | Yang TIDAK diambil |
|---|---|---|
| Poster dan zine cetak risograf | Warna terbatas 2-3 tinta datar; satu blok tinta penuh menjadi titik fokus; kertas putih sebagai ruang tenang | Efek salah register, butir/noise, tumpang-tindih warna, warna fluoresen (pink neon) |
| Lembar uji cetak (proof sheet) | Kotak bergaris tebal berisi angka dan catatan, rapi berbaris | Tanda potong dan register mark sebagai hiasan |

## Dial per jenis area (1-10; antislop 1-3)
Proyek ini hanya punya layar dashboard (UX §3).

| Jenis | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | antislop ENERGY / RHYTHM / MOTION | Alasan singkat |
|---|---|---|---|---|---|
| Layar tugas | - | - | - | - | Tidak ada di proyek ini |
| Dashboard pantau (Live, Daftar proyek, Run lama) | 6 | 3 | 5 | 2 / 3 / 2 | Blok tinta penuh dan angka besar memberi energi; komposisi pita tidak simetris |
| Dashboard telusur (Detail agent, Backlog, Riwayat, Laporan token, Ringkasan run) | 4 | 2 | 6 | 2 / 2 / 1 | Tetap berkarakter (pita tinta di kepala bagian) tapi tabel rapat untuk dibaca lama |
| Pemasaran | - | - | - | - | Tidak ada (UX §7) |

Design Read: dashboard pemantau lokal untuk satu pemilik, bahasa visual lembar cetak risograf (kertas putih, tiga tinta datar, garis tebal), dial 2/3/2 (pantau).

## Rancangan layar

### Live (tampilan proyek), 1440 x 900, panel samping terbuka 400 px
- Jenis: dashboard pantau. Pertanyaan: "Apakah saya perlu pindah ke Claude sekarang, dan bila tidak, apakah kerja berjalan normal?"
- Titik fokus: blok Siapa kerja (60% lebar pita, satu-satunya blok tinta penuh di layar) karena warnanya sendiri sudah menjawab "perlu pindah?" sebelum teksnya dibaca.
- Urutan baca: 1. blok Siapa kerja (koral: "Butuh input: jawab di Claude") 2. kotak pemberitahuan tepat di bawahnya 3. node berpita tinta di grafik, lalu Progres dan Token.
- Blok atas ke bawah: bilah atas 48 px (nama proyek + pengalih, Live | Riwayat, bunyi, tema) · pita menempel, asimetris: blok Siapa kerja 60% berisi tinta penuh menurut keadaan (koral = butuh input, hitam = gagal, tint hijau = berjalan normal, kertas = tidak ada yang berjalan), kalimat Bricolage 30 + baris nama/aktivitas; di kanan dua kotak kertas bergaris 2 px: Progres ("12%" angka 40, "Backlog 9 dari 77 item · 42 mnt") dan Token ("1,84 jt", "+62% dari pembanding", tanda Boros mustard; dikoreksi dari +18% karena Boros baru berlaku di atas 150% pembanding) (F3) · kotak pemberitahuan lebar penuh bergaris 2 px dengan tab label koral di kiri atas ("Butuh input · 2 mnt lalu"), pertanyaan 18 + pilihan bernomor + "Jawab di aplikasi Claude." + "Lihat percakapan" (F5) · grafik di atas kertas polos: node 248 px bergaris 2 px, kepala node = pita tinta berisi status (ikon + teks), isi: nama Bricolage 18, aktivitas, cuplikan hasil 2 baris, baris angka token · durasi · model; garis penghubung 2 px hitam, aktif hijau (F2) · panel 400 px dipisah garis 2 px, tanpa bayangan (F4).
- Kartu/grafik menjawab: blok Siapa kerja menjawab "perlu pindah?"; kotak Progres dan Token menjawab "sampai mana" dan "boros tidak"; pita kepala node menjawab "agent mana bermasalah" dari jauh.
- Konsep terlihat di: blok tinta penuh, pita tinta di kepala node, angka besar grotesk, garis tebal siku, Boros sebagai tinta mustard.
- Sengaja tidak ada: gradien, bayangan lembut, efek butir atau salah register, warna fluoresen, garis warna di tepi kiri kartu.
- Wujud saat dibangun: panel 400 px setinggi layar di kanan (pita dan kotak pemberitahuan hanya di atas kolom grafik, supaya detail punya tinggi penuh); kepala panel detail = pita status 32 px seperti kepala node (bukan blok tinta penuh, agar blok Siapa kerja tetap satu-satunya); nama agent di panel 24 (skala tidak punya 26). Durasi run pindah ke baris label Progres. Pemilih "Data contoh" di bilah atas mengganti keadaan (Butuh input, Gagal, Berjalan normal) untuk menilai pergantian tinta.

## Wujud arah C di setiap layar (semua dashboard)
- **Live**: seperti rancangan di atas. Normal: blok tint hijau dengan "2 agent berjalan", sisanya kertas dan hitam. Masalah: blok berubah koral (butuh input) atau hitam (gagal); node bermasalah berpita sama.
- **Detail agent (panel)**: kepala panel = pita tinta status selebar panel dengan nama agent Bricolage 26; peringatan sebagai kotak bergaris 2 px dengan ikon; satu kalimat jawaban 18; tiga angka besar (24) dalam tiga kotak bergaris yang bersambung; rincian sebagai bagian dengan judul tebal dan garis 2 px di atas.
- **Backlog (panel)**: baris jawaban sebagai blok kecil (koral bila ada keputusan menunggu, kertas bila tidak); bagian = kotak bergaris dengan batang progres tinta hijau tebal 6 px; item gagal berpita hitam kecil.
- **Riwayat + Laporan token**: Riwayat: empat angka besar dalam kotak bersambung, tren 12 run sebagai batang tinta hijau (run Boros = batang mustard), daftar run tabel bergaris. Laporan token: dialog seperti catatan pemakaian tinta; tiga penyumbang terbesar sebagai batang horizontal tebal berlabel persen.
- **Daftar proyek, Ringkasan run**: Daftar proyek sebagai baris bergaris tebal dengan blok keadaan berwarna tinta di kiri (bukan garis tipis), yang butuh kamu di atas. Ringkasan run sebagai satu lembar: keputusan tersisa di blok koral teratas, lalu langkah selesai/dilewati/gagal dalam dua kolom.

## Warna
Kertas putih netral; tiga tinta datar. Saat normal hanya hijau yang tampil.

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| --bg | #FBFAF7 | #1B1B19 | latar kertas |
| --surface | #FFFFFF | #242422 | node, panel, kotak |
| --surface-sunk | #F1EFEA | #2C2C29 | bilah atas, kepala tabel |
| --text | #161616 | #F2F0EA | teks utama, garis tebal |
| --text-muted | #4F4F4F | #BDBAB2 | teks sekunder |
| --text-faint | #666666 | #9C9990 | keterangan (≥4.5:1) |
| --line | #161616 | #F2F0EA | garis 2 px (bagian dari gaya) |
| --line-soft | #D6D3CB | #3A3A37 | pemisah baris tabel |
| --accent | #161616 | #F2F0EA | tautan bergaris bawah, cincin fokus, node terpilih (seleksi lewat tebal, bukan hue) |
| --ink-run | #0E5A47 | #5CC4A3 | Berjalan (teks, garis aktif) |
| --ink-run-tint | #D7EAE2 | #1D3A31 | isi blok Siapa kerja saat normal |
| --on-ink-run | #FFFFFF | #161616 | teks di atas pita Berjalan (ditambah saat membangun) |
| --ink-input | #E4572E (isi, teks --text) | #FF8A65 (isi, teks #161616) | Butuh input |
| --ink-input-text | #B23A17 | #FF8A65 | ikon/teks koral di atas kertas |
| --ink-fail | #161616 (isi, teks putih) | #F2F0EA (isi, teks #161616) | Gagal: blok tinta hitam |
| --ink-warn | #F2C14E (isi, teks --text) | #F2C14E | Diam, Boros, model beda |
| --ink-idle | #666666 | #9C9990 | Menunggu, Dilewati, Selesai |

## Tipografi
- Judul, angka besar, nama agent: **Bricolage Grotesque** (OFL; grotesk dengan lebar dan kontras yang berubah, terasa seperti huruf poster cetak). Alasan: membawa energi tanpa warna tambahan.
- Teks dan label: **Atkinson Hyperlegible Next** (OFL; dirancang untuk membedakan huruf mirip seperti l/1/I, 0/O). Alasan: nama file, angka token, dan id item harus terbaca tepat di node padat.
- Mono: sistem (`ui-monospace, Consolas`) hanya untuk path file dan perintah tool, 13 px.
- Skala: 12 / 13 / 14 / 16 / 18 / 24 / 30 / 40. Line-height isi 1.5, judul 1.05-1.15, angka 40 letter-spacing -0.02em. Tidak ada kapital bertracking lebar.
- Font di-host sendiri (woff2, tanpa CDN): `fonts/` dari paket @fontsource-variable, lisensi OFL di folder yang sama.

## Spacing & layout
- Unit 4; skala 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Pita tinggi ±120 px, menempel, asimetris 60/20/20. Panel 400 px (≥1200), 340 px (900-1199).
- Grafik: node 248 px, jarak horizontal 64, vertikal 32 (lebih lega dari arah lain).

## Bentuk
- Radius: 0 (node, kotak, blok, panel), 2 (chip, input). Siku adalah identitas arah ini.
- Bayangan: satu jenis saja, blok datar `4px 4px 0` warna --text, hanya pada node terpilih dan dialog Laporan token (penanda angkat, bukan hiasan).
- Garis: 2 px --line untuk wadah; 1 px --line-soft untuk baris tabel.

## Komponen
- Tombol: utama = isi --text, teks kertas, siku; sekunder = garis 2 px; ghost = teks bergaris bawah 2 px.
- Node: kotak siku bergaris 2 px, kepala pita tinta 28 px berisi status (ikon + teks); terpilih = bayangan blok datar.
- Tab rel: teks tebal; tab aktif = isi --text dengan teks kertas; lencana angka tindakan saja (UX §5).
- Tabel: baris 44 px, angka rata kanan tabular, garis 1 px --line-soft, kepala bergaris 2 px.
- Empty/memuat/galat: kotak bergaris putus 2 px + kalimat + aksi, mis. "Belum ada run. Kirim prompt di Claude untuk mulai."

## Motion
- Durasi 150 ms (mikro), 220 ms (blok berganti tinta, panel). Easing ease-out.
- Dianimasikan: blok Siapa kerja berganti warna (crossfade isi), garis penghubung aktif berganti ke hijau, pita kepala node berganti tinta.
- Tidak dianimasikan: denyut, guncangan, angka bergulir. `prefers-reduced-motion`: semua transisi 0.

## Istilah & nada (maks 10 baris)
- Bahasa UI: id, sapaan "kamu", kalimat pendek.
- Istilah dari UX §6/§10: Butuh input, Gagal, Diam <n> mnt, Boros, setara, pembanding, Sesi utama, run, bagian.
- Metafora cetak hanya pada bentuk; teks tidak memakai "tinta", "cetakan", "drum".
- Kalimat blok Siapa kerja: "Butuh input: jawab di Claude", "1 agent gagal", "2 agent berjalan", "Tidak ada agent yang berjalan".
- Data token belum ada: "menunggu data".

## Larangan khusus arah ini
- Hanya tiga tinta; tidak ada warna keempat untuk dekorasi.
- Tidak ada efek butir, salah register, atau warna fluoresen.
- Blok tinta penuh hanya satu per layar (blok Siapa kerja atau kepala panel detail), supaya tidak ramai.

## Pelanggaran disengaja
| Temuan audit | Di mana | Alasan |
|---|---|---|
| keluarga-huruf: 3 (sedang) | path file, perintah tool | Mono sistem hanya untuk path dan perintah (ditetapkan di Tipografi); bukan gaya |
| titik-fokus: 15 tombol berlatar solid (sedang) | node grafik | Node adalah tombol (klik membuka detail) dan wajib berlatar kertas di atas grafik; aksi utama layar tetap di Claude, bukan di viewer |
| kandidat fokus audit = angka 40 (rendah) | Progres, Token | Audit mengukur ukuran huruf; fokus rancangan adalah blok Siapa kerja (624 x 120 px tinta penuh, satu-satunya); screenshot menunjukkan blok terbaca pertama |
| copy-tombol panjang (rendah) | node grafik | Isi node adalah kartu data F2, bukan label tombol |

## Decision log
| Tanggal | Perubahan | Alasan |
|---|---|---|
| 2026-11-04 | Arah C ditulis (konsep-3) | Pilihan arah oleh pemilik |
| 2026-11-04 | Live 1440 dibangun; token --on-ink-run dan @font-face ditambah; Token +62% | Bangun arah C |
