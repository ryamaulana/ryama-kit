# DESIGN: Flow Viewer v2, arah "Gading"

Status: **Approved** (2026-10-27) · Pemilik memilih arah A dari 3 mockup · Bahasa UI: id
Acuan: `docs/PRD.md` (Locked v1.0), `docs/UX.md` (alur, peta layar, istilah), mockup `docs/mockups/arah-a/` (`live.html`, `ringkasan.html`, `arah.css`).
Aturan hierarki: token di dokumen ini menang atas selera lain. Mockup adalah contoh sah dari dokumen ini; bila beda, perbaiki salah satunya dan catat di Decision log.

## 1. Arah dan ide

**Ide satu kalimat:** panel putih-gading melayang dan bulat, angka besar bertipe serif, satu aksen biru untuk aksi, dan satu garis teal yang hidup menandai siapa yang sedang bekerja.
**Konsep:** viewer ini dilirik sepintas dan dibaca saat dibutuhkan. Karena itu satu hal selalu paling berat di layar: kotak **Butuh input** (bila ada). Grafik kedua, tiga angka ketiga.
**Dial taste:** ENERGY 1-2 · RHYTHM 2 (pita, kotak, grafik, panel berbeda komposisi) · MOTION 1 (hanya status hidup: putaran ikon Berjalan dan titik di konektor aktif; mati bila `prefers-reduced-motion`).
**Dial per jenis area:** semua layar Flow Viewer berjenis dashboard (UX.md §3; tidak ada layar pemasaran, tidak ada layar tugas). Dial Live di atas jadi acuan; area lain hanya menurunkan RHYTHM menurut isinya.

| Area | Jenis | ENERGY | RHYTHM | MOTION |
|---|---|---|---|---|
| Live (pita, kotak, grafik, panel) | dashboard | 1-2 | 2 | 1 (hanya status hidup) |
| Detail agent (panel, satu kolom berlipat) | dashboard | 1 | 2 | 1 (hanya ikon Berjalan) |
| Daftar proyek, Riwayat, Laporan token | dashboard | 1 | 1-2 (tabel/daftar boleh seragam, angka serif tetap fokus) | 0-1 |
| Ringkasan run, panel data (Skill, File, Token, Log, Percakapan, Backlog) | dashboard / pendukung | 1 | 1 | 0 |

**Titik fokus per layar:** Live: kotak Butuh input (bila ada), bila tidak, sel "Siapa kerja". Ringkasan run: kartu "Menunggu keputusanmu", bila tidak ada, hasil run. Urutan baca Live: judul sel Siapa kerja, kotak Butuh input, grafik, panel.
**Di mana konsep terlihat:** serif hangat untuk kalimat penting (pertanyaan agent, judul sel, angka), ivory bukan abu, garis teal hidup.

## 2. Token

### Huruf
Newsreader (variabel, 500) untuk pertanyaan, judul besar, angka. Hanken Grotesk (variabel 400-700) untuk semua teks antarmuka. Tertanam di `fonts/`; tidak butuh jaringan. Maks 2 keluarga, 3 bobot (400/500, 600, 700).

| Skala (px) | Dipakai untuk |
|---|---|
| 12 | label kecil di luar node: keterangan, lencana, tag, kepala tabel |
| 13 | teks sekunder, isi panel, tautan, tab |
| 14 | teks dasar, nama dan isi **node ringkas**, tombol |
| 16 | judul panel, cuplikan hasil (serif) |
| 24 | pertanyaan Butuh input (serif), judul "Alur build" |
| 28 | judul sel Siapa kerja, judul Ringkasan run (serif) |
| 32 | angka KPI saat ada pemberitahuan terbuka; angka KPI di 900-1199 px |
| 44 | angka KPI tanpa pemberitahuan; angka besar Ringkasan run |

Line-height: isi 1.4-1.5, judul serif 1.2-1.25. Angka dan durasi: `tabular-nums`. Sentence case di semua teks.

### Spasi (px)
2 · 4 · 8 · 12 · 16 · 20 · 24 · 28. Dalam grup 4-12, antar grup 12-24, antar panel 12, padding halaman 16.

### Radius
12 (chip, ubin, tombol kecil, strip), 20 (kartu, node, kotak pemberitahuan), 28 (panel besar), pil 999 (nav, tab, status, tombol). Jangan semua pil: kartu dan node bukan pil.

### Bayangan (maks 3)
- `s1` panel melayang dan kartu KPI: `0 1px 2px` dan `0 8px 24px` (alpha .06 / .08).
- `s2` kartu kecil, node, tombol ikon: `0 1px 2px` (alpha .12).
- `s3` hanya yang melayang di atas (menu Lainnya): `0 12px 40px` (alpha .25).
Tidak ada glow, tidak ada blur latar. Pemilihan node dibedakan dengan outline, bukan bayangan.

### Palet (terang / gelap) dan peran
| Token | Terang | Gelap | Peran |
|---|---|---|---|
| `--ground` | `#F3F0E8` | `#14120E` | latar halaman |
| `--surface` | `#FFFEFB` | `#1F1D17` | kartu, node, panel |
| `--surface2` | `#F6F2E9` | `#191712` | ubin, status netral, node Dilewati |
| `--line` | `#DDD6C7` | `#39352B` | garis kartu (dekoratif) |
| `--edge` | `#8A826D` | `#847E6C` | konektor, cincin tombol sekunder (garis grafis, 3:1) |
| `--ink` | `#1B1914` | `#F5F1E7` | teks utama, outline node terpilih, logo, nav aktif, lencana netral |
| `--ink2` | `#46413A` | `#D3CDBE` | teks sekunder dan keterangan (tidak ada tingkat "redup" lagi) |
| `--accent` | `#1D44D6` | `#8EAAFF` | **aksi saja**: tombol utama, tab terpilih, tautan, fokus |
| `--on-accent` | `#FFFFFF` | `#0E1330` | teks di atas aksen, ink, warn |
| `--accent-soft` | `#E6EBFE` | `#222C5E` | hover, tombol ikon aktif |
| `--run` / `--run-soft` | `#0B6B7C` / `#DCF0F3` | `#6FD3E3` / `#103A42` | status **Berjalan**, konektor aktif (warna sendiri, bukan aksen) |
| `--ok` / `--ok-soft` | `#17683F` / `#DFF2E7` | `#73D6A2` / `#163526` | Selesai |
| `--warn` / `--warn-soft` | `#8A4F00` / `#FFEFCF` | `#F4C068` / `#3B2A0C` | Butuh input |
| `--bad` / `--bad-soft` | `#B0201A` / `#FCE5E2` | `#FF9C92` / `#43191A` | Gagal |
| `--ok-line`, `--warn-line`, `--bad-line` | `#3E9B6A` `#C98513` `#D14A42` | `#3E9B6A` `#D69A2B` `#E5645B` | garis putus-putus node, segmen batang |

Aturan peran: aksen biru bukan status. Status tidak jadi dekorasi dan selalu ikon + teks. `--warn` dipakai untuk Butuh input (kotak, node, tab/rel yang ada pertanyaan atau keputusan: Percakapan bertanya, Backlog perlu keputusan). Lencana rel lain netral (ink). Selisih token ("+12%") netral (ink), bukan warn.

### Rasio kontras (WCAG AA: teks 4,5:1; garis grafis 3:1)
| Pasangan | Terang | Gelap |
|---|---|---|
| ink / surface | 17,41 | 14,94 |
| ink / ground | 15,42 | 16,59 |
| ink2 / surface | 10,02 | 10,63 |
| ink2 / surface2 | 9,05 | 11,30 |
| ink2 / warn-soft | 8,90 | 8,70 |
| ink2 / bad-soft | 8,40 | 9,51 |
| accent / surface | 7,31 | 7,50 |
| accent / warn-soft (tautan di kotak) | 6,49 | 6,14 |
| accent / bad-soft (tautan di kartu Gagal) | 6,12 | 6,71 |
| on-accent / accent | 7,37 | 8,09 |
| on-accent / ink (lencana netral, logo, nav aktif) | 17,41 | 14,94 |
| run / surface | 6,11 | 9,71 |
| run / run-soft | 5,22 | 7,09 |
| run / ground (konektor) | 5,41 | 10,78 |
| ok / ok-soft | 5,83 | 7,55 |
| warn / warn-soft | 5,78 | 8,27 |
| bad / bad-soft | 5,69 | 7,48 |
| bad / warn-soft (teks "Gagal 1" di judul kotak) | 6,03 | 6,85 |
| edge / surface (konektor, cincin tombol) | 3,79 | 4,16 |
| edge / warn-soft (cincin) | 3,37 | 3,40 |
| ink / ground (outline node terpilih) | 15,42 | 16,59 |

## 3. Bahasa status
Enam status, selalu **ikon + teks** (urutan ikon: lingkaran putar, centang, tanya, silang, panah ganda, jam). Warna menguatkan, tidak membawa makna sendirian.
| Status | Ikon | Warna | Node | Konektor masuk |
|---|---|---|---|---|
| Berjalan | putaran (berputar) | run | border run 2 px solid, port terisi | teal 3 px + titik bergerak |
| Selesai | centang | ok | border line | abu solid |
| Butuh input | tanya | warn | latar warn-soft, border warn-line 2 px putus-putus | abu |
| Gagal | silang | bad | latar bad-soft, border bad-line 2 px putus-putus | bad-line putus-putus |
| Dilewati | panah ganda | ink2 | latar surface2 | abu |
| Menunggu | jam | ink2 | surface, border line | abu putus-putus halus |

**Node terpilih:** outline 3 px `--ink`, offset 3 px, terpisah dari border status (jadi node Berjalan yang dipilih tetap terbaca: border teal di dalam, cincin ink di luar). Rasio outline 15:1 ke latar. Tidak memakai aksen.

## 4. Aturan komponen

### Node
- Dua mode. **Penuh** (zoom 100% ke atas): 232 x 122 px; baris nama + status, meta (putaran, durasi, token, model), aktivitas, cuplikan 2 baris; teks 12-13 px. **Ringkas** (zoom di bawah 100%): 188 x 84 px; tiga baris: ikon + nama (+ BG), status, aktivitas satu baris; semua teks **14 px**, cuplikan dan meta disembunyikan (ada di panel detail).
- Mode ringkas dipilih otomatis bila ukuran penuh tidak muat di panggung, dan oleh tombol Perkecil bila zoom turun di bawah 100%. Zoom yang tampil di label dihitung relatif ke kartu penuh.
- Grid node: kolom per fase (Prompt dan Sesi utama, lalu fase flow), baris 4 untuk 12 agent (14 node). Posisi dari variabel `--c` dan `--r`; konektor dihitung dari posisi nyata.
- Penanda BG: kotak 12 px (14 px di mode ringkas) di samping nama.
- Node Sesi utama saat Butuh input: penuh "Butuh input: lihat pertanyaan di atas", ringkas "Lihat pertanyaan di atas" (status sudah tertulis di baris atasnya).

### Ukuran teks minimum node (aturan keras)
Teks efektif di layar (ukuran CSS x skala zoom) **minimal 12 px**. Mode ringkas: 14 px x skala >= 0,86, dijaga oleh batas zoom bawah (zoom label 74%, skala 0,89). Bila 12 agent tidak muat pada batas itu (mis. panel terbuka di 900 px), grafik **dipan** (digeser), bukan dikecilkan lagi. Bukti terukur (Playwright, 14 node): 1440 px: skala 1,02, teks node terkecil 14,3 px; 900 px: skala 0,90, teks node terkecil 12,6 px. Uji ini diulang tiap perubahan ukuran node.

### Konektor
Kurva halus kolom ke kolom (garis lurus vertikal antar node bertumpuk). Garis 2 px `--edge`; aktif 3 px `--run` dengan titik 5 px bergerak 2,6 dtk; Gagal `--bad-line` putus-putus 6 6; belum jalan titik-titik 3 6. Port 12 px di tepi kiri dan kanan node.

### Kartu KPI (pita tiga indikator)
Tiga kartu radius 20, bayangan s1; sel pertama paling lebar (1,5fr; 2,5fr di 900-1199 px). Isi urut: Siapa kerja (judul serif 28 px: **"Menunggu kamu: jawab pertanyaan"** bila ada input, selain itu status sesi; lencana jumlah agent berjalan; tombol "Ringkasan"; maks 2 baris agent), Progres (angka, batang ink, "Backlog N dari N item", "Durasi N mnt N dtk"), Token (angka, "setara input", sparkline di 1200+ px, selisih netral). Angka KPI **32 px** saat ada pemberitahuan terbuka, 44 px bila tidak ada. Batang progres dan sparkline berwarna ink (netral), bukan aksen.

### Kotak pemberitahuan (elemen terberat di Live)
- Wadah: latar `--warn-soft`, garis kiri **4 px** `--warn` (menandai keadaan nyata Butuh input), radius 20. Judul: "Butuh input 2 · Gagal 1" (angka sebenarnya), di kanan "Jawab di aplikasi Claude." + tautan "Lihat percakapan".
- Pertanyaan: serif **24 px**, di bawahnya satu kalimat konteks 13 px, lalu pilihan jawaban sebagai **daftar bernomor tanpa bingkai** (viewer hanya memantau, pilihan bukan tombol; 3 kolom di 1200+, 1 kolom di bawahnya). Kalimat konteks dan "Jawab di aplikasi Claude." **tampil di semua lebar**.
- Item Butuh input kedua (mis. keputusan backlog): satu strip surface selebar kotak. Maks 2 item terbuka, sisanya "+N lainnya".
- Item **Gagal terpisah**: kartu `--bad-soft`, tepi 2 px `--bad`, judul "Gagal · agent · jam", teks, tautan "Lihat detail".
- Mode ringkas (saat Ringkasan terbuka): satu baris "Butuh input N" (isi lengkap sudah ada di Ringkasan).

### Panel samping dan rel
- 1200+ px: panel 380 px (320 sampai 60% bila ditarik). 900-1199 px: default **tertutup**, saat dibuka lebar 340 px dan **mendorong grafik** (bukan menimpa). Panel dibuka bila node diklik atau rel diklik; Esc menutup dan melepas pilihan node. Di bawah 900 px: Tahap B (daftar kartu, panel lapisan penuh).
- Rel ikon pil di kanan: Percakapan, Backlog, File, Skill, Token, Log. Lencana: **warn** hanya untuk Percakapan (ada pertanyaan) dan Backlog (ada keputusan); File dan Skill lencana netral ink. Tab terpilih: aksen. Ubin detail memakai durasi "6 mnt 40 dtk".
- Detail node (Tahap A: Ringkasan, Aktivitas, File, Hasil) dan data proyek mengisi panel yang sama.

### Tombol dan kontrol
Satu aksi utama per layar (aksen solid, pil, 36 px). Sekunder: transparan dengan cincin `--edge` 2 px. Tombol ikon 36 px pil. Fokus: `outline 3px --accent`, offset 2. Menu Lainnya (Reset run, Laporan teks) membuka di bawah tombol "...", Esc menutup; Reset run dua langkah ("Yakin? Klik lagi", 3 dtk).
Status koneksi: ikon + teks "Tersambung" (tidak pernah hanya ikon, juga di 900 px).

### Ringkasan run
Satu lapisan besar (radius 28) di bawah pita dan strip. Urut: judul + putusan + tombol "Buka Riwayat" (sekunder) dan "Tutup" (utama, Esc) · "Menunggu keputusanmu (N)" (kartu warn-soft, garis kiri 4 px, pertanyaan serif 20 px, pilihan bernomor) · Langkah (tabel dengan kepala kolom; durasi tabel ditulis "N mnt N dtk") · Token dan Durasi (angka serif 44 px, satuan 16 px, selisih netral) · File berubah. Pita tetap terlihat; sel Siapa kerja memuat tombol "Ringkasan" sebagai penanda.

## 5. Perilaku per lebar
| Lebar | Perilaku |
|---|---|
| 1200+ px | Grafik dan panel berdampingan (panel 380 px terbuka). Pita 1,5fr 1fr 1fr dengan sparkline. Bilah atas penuh (nama produk, path proyek). Node ringkas di 1440 x 900 (14 node muat, zoom label 85%). |
| 900-1199 px | Panel **tertutup** default, dibuka lewat rel atau klik node, mendorong grafik (340 px). Pita 2,5fr 1fr 1fr, Progres bertumpuk, sparkline disembunyikan. Pilihan jawaban 1 kolom. Nama produk dan path disembunyikan di bilah atas; status koneksi tetap berlabel teks. Legenda status disembunyikan saat panel terbuka. Panel terbuka: grafik dipan. |
| di bawah 900 px | **Tahap B**: grafik menjadi daftar kartu agent vertikal, panel menjadi lapisan penuh dari baris tab di bawah pita. Belum dirancang. |

Tinggi acuan: viewport 900 px. Tampilan Live tidak menggulung sebagai halaman; grafik dipan, panel menggulung di dalamnya.

## 6. Istilah & nada
Sapaan "kamu", sentence case, tanpa seruan, tanpa slogan di layar fungsional. Tugas dulu, merek belakangan. Fakta hanya dari PRD dan UX.md. Durasi: "14 mnt 32 dtk" (kalimat dan KPI), "Durasi 38 mnt 12 dtk"; di tabel padat dengan kepala kolom "Durasi" tetap "N mnt N dtk".
Glosarium (dari UX.md bagian 10, dulu bagian 7; satu istilah satu makna):
| Istilah | Makna |
|---|---|
| Proyek | Folder kerja tempat Claude Code dijalankan |
| Run | Satu putaran kerja dari prompt sampai selesai |
| Agent | Anggota crew; satu node di grafik. "Sesi utama" = Claude yang menerima prompt |
| Status | Menunggu, Berjalan, Selesai, Dilewati, Butuh input, Gagal (selalu ikon + teks) |
| Butuh input | Claude atau agent menunggu jawaban, izin, atau keputusanmu. Satu-satunya istilah; judul sel "Menunggu kamu: jawab pertanyaan" adalah kalimat penjelas, bukan status lain |
| Langkah wajib | Agent yang harus jalan menurut flow; tidak jalan = Dilewati |
| Token | Setara input: perkiraan beban, bukan tagihan |
| Pemberitahuan | Judul tab, bunyi, notifikasi desktop, dan kotak di layar |
| Ringkasan run | Satu layar hasil run yang selesai |
| Riwayat | Daftar run tersimpan; run lama hanya bisa dibaca |

## 7. Pelanggaran disengaja
- **Warna teks 8 peran** (ink, ink2, on-accent, aksen, run, ok, warn, bad): audit menyarankan 3-5. Empat status adalah peran wajib (enam status, tidak boleh hanya warna).
- **Warna latar banyak (14, rendah):** tiap status punya latar lembut sendiri.
- **Angka KPI 44 dan 32 px, judul sel 28 px:** titik fokus pita, di luar skala isi tetapi masuk skala token.
- **`copy-ulang` (rendah):** aktivitas agent tampil di sel Siapa kerja dan di node karena data yang sama (PRD F2 dan F3).
- **Garis kiri 4 px pada kotak Butuh input dan kartu keputusan:** kebijakan antislop menganggap garis kiri berwarna sebagai dekorasi; di sini ia menandai keadaan nyata (butuh input) dan diminta review ui-critic. Tidak dipakai di kartu lain.
- **Set ikon garis 1,75 px bergaya library:** dipilih untuk konsistensi dengan teks 12-14 px; tiap ikon mewakili status atau peran agent yang tertulis (lihat bagian 3).
- **Animasi tak berhenti (putaran ikon, titik konektor):** hanya pada status Berjalan nyata, mati pada `prefers-reduced-motion`.
- **Data contoh:** proyek `tryouthub`, 12 agent, angka dan nama file di mockup adalah contoh buatan untuk menguji layout, bukan data nyata.

## 8. Tahap B: layar sisanya (belum dibuat)
Dibuat setelah dokumen ini Approved, dengan token dan dua layar kunci di atas, lewat backlog:
1. **Daftar proyek** (`/`): satu baris per proyek aktif, urut butuh input dulu; keadaan kosong.
2. **Riwayat**: tabel run, tren token 12 run, banding dua run (peringatan flow berbeda), Hapus dengan satu konfirmasi di tempat (UX v1.2 §5, A15), run live tanpa Hapus.
3. **Tampilan run lama** (tata letak Live hanya baca, bilah "Kembali ke live").
4. **Tab panel data proyek**: Skill, File (diff di tempat), Token (tabel per agent), Log (linimasa); Percakapan dan Backlog sudah digambar di mockup, perlu state lengkap.
5. **Detail agent satu kolom, bukan tab:** Ringkasan, Aktivitas, File, dan Hasil menjadi bagian berlipat (disclosure) dalam satu kolom panel yang sama; Ringkasan terbuka, sisanya terlipat dengan judul dan hitungan (mis. "File (4)"). Tidak ada baris tab Aktivitas/Hasil di detail agent. Tambahan: agent belum jalan, state gagal dimuat.
6. **State:** kosong, memuat (kerangka), terputus (bilah + jam pembaruan terakhir), notifikasi diblokir, tanpa flow.
7. **Agent di luar flow** ("di luar flow", node redup "tidak dipakai di flow ini") dan node di luar flow yang dipakai.
8. **Di bawah 900 px:** daftar kartu agent dan lapisan panel.
9. **Menu Lainnya** berfungsi penuh (Laporan teks `/report`), tombol notifikasi izin ditolak, tawaran notifikasi sekali.

## 9. Decision log
| Tanggal | Keputusan | Alasan |
|---|---|---|
| 2026-10-27 | Arah A "Gading" dipilih pemilik | Terang, hangat, tenang; angka serif mudah dilirik |
| 2026-10-27 | Panel default tertutup di 900-1199 px dan mendorong grafik | Disetujui pemilik; 12 node harus terbaca di 900 px |
| 2026-10-27 | Review ui-critic diterapkan: kotak Butuh input jadi elemen terberat (latar warn-soft, garis kiri 4 px, pertanyaan serif 24 px), Gagal dipisah, angka KPI 32 px saat ada pemberitahuan | Hierarki: satu titik fokus di Live |
| 2026-10-27 | Mode node ringkas (teks 14 px, tanpa cuplikan) dan 12 agent (14 node) sebagai kasus uji | Teks efektif minimal 12 px; terbukti terukur |
| 2026-10-27 | Status Berjalan memakai warna sendiri (teal), aksen biru hanya untuk aksi; node terpilih outline ink 3 px offset 3 px | Pisahkan "dipilih" dari "berjalan" dan aksen dari status |
| 2026-10-27 | Lencana rel netral, warn hanya untuk Percakapan bertanya dan Backlog perlu keputusan; selisih token netral | warn punya satu arti: ada yang menunggu kamu |
| 2026-10-27 | Tingkat teks "redup" (ink3) dihapus; tombol sekunder bercincin; logo dan nav aktif berwarna ink | Kurangi warna teks dan tombol solid yang berebut fokus (audit) |

## Masalah terbuka dari review ui-critic putaran 2 (wajib diselesaikan di build, bukan di mockup)
Dua putaran review sudah dipakai; perbaikan dilakukan saat layar dibangun sungguhan (jadi item backlog, urut dampak):
1. Tinggi laptop nyata (1366x657, 1440x780, 900x780): grafik terpotong dan kontrol zoom tidak terjangkau karena rel ikon mengunci tinggi baris. Tinggi baris `minmax(0,1fr)`, rel `max-height:100%; overflow-y:auto`, kotak Butuh input maksimal 30% tinggi dengan gulir di dalamnya. Tambahkan 1366x657 dan 1440x780 sebagai tinggi acuan (bukti di bagian 4 hanya valid di tinggi 900).
2. Fokus Live: kartu Gagal pakai border 1 px `--bad-line`; kotak Butuh input diberi border 1 px `--warn-line`; judul pertanyaan 28 px, angka KPI 24 px selama kotak terbuka. Border putus-putus node Butuh input harus >= 3:1 (kini 2,70:1 di terang).
3. Batas zoom minimum 74% (teks node >= 12 px), sama dengan Pas layar.
4. Kontrol zoom tidak boleh menutupi node: sisakan 48 px di bawah area pas layar.
5. Panel 900-1199 px terbuka: node terpilih di-scroll ke terlihat; baris tab tidak patah (nowrap, padding 8 px); ubin detail 2 kolom.
6. Esc: di 1200+ kembali ke tab data terakhir (bukan menutup panel); di 900-1199 posisi dan zoom grafik disimpan dan dipakai ulang (PRD F4 AC2).
7. Tab terpilih: latar `--accent-soft`, teks `--accent` (bukan pil biru solid). Copy Ringkasan: "Tidak ada agent yang berjalan."; "Butuh input (2)"; "Agent be berhenti di putaran 2."; angka pembanding `white-space:nowrap`.
8. Pilihan jawaban keputusan backlog tampil di Live (F5 AC5), bukan hanya di Ringkasan.
9. Menu "Laporan teks" dihapus dari UI v2 (PRD: ekspor laporan teks = "Nanti", F10).
