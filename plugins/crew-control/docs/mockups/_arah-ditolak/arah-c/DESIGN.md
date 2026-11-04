# DESIGN · Arah C "Daftar yang bicara"

Status: Draft (konsep-3, menunggu pemilik memilih) · 2026-11-04
Token mesin: `docs/mockups/arah-c/tokens.css` · Data mockup: `docs/mockups/data-mockup.md`

## Kesan (3 kata)
**tenang · hidup · akrab** (asumsi, minta konfirmasi). Tenang dari Linear (teks jadi hierarki), hidup dari n8n (yang aktif menyala), akrab dari aplikasi Claude (pertanyaan terasa seperti pesan biasa).

## Konsep
Crew Control terasa seperti **daftar obrolan di aplikasi pesan: yang punya pesan untukmu bertitik biru dan naik ke atas, sisanya tenang**, karena pemilik memantau banyak agent tetapi hanya bertindak saat ada pesan untuknya; ini terlihat dari **kolom agent sebagai daftar teks yang mengurut ulang sendiri (tinta hitam = sedang kerja, abu = diam)**, **satu-satunya warna di layar adalah biru "untukmu"**, dan **grafik berupa nama-nama yang tersambung garis, tanpa kotak**.

## Cara arah ini menjawab ketiga kesan
- **Tenang:** nyaris monokrom, tanpa bidang per kolom dan tanpa kotak node; hierarki dibentuk dari tinta hitam vs abu dan dua bobot huruf.
- **Hidup:** daftar agent mengurut ulang sendiri saat status berubah. Di grafik, node yang Jalan dibalik menjadi label bertinta (bidang gelap, teks terang) dengan garis masuk yang mengalir, jadi satu-satunya bidang padat di kanvas adalah yang sedang kerja.
- **Akrab:** pola yang sudah dikenal dari aplikasi pesan: yang menunggu kamu diberi titik biru dan naik ke atas, seperti pesan belum dibaca, bukan alarm.

## Jawaban untuk 3 pertanyaan pemilik
1. **Siapa yang kerja (3 detik):** kolom agent paling lebar; yang Jalan bertinta hitam tebal dengan item dan lama kerja di baris kedua, sisanya abu satu baris. Mata membaca "hitam = kerja" tanpa legenda. Di grafik, nama yang Jalan hitam dengan garis masuk bergerak; lainnya abu.
2. **Ada yang nanya:** titik biru "untukmu" (seperti pesan belum dibaca) di baris agent yang teratas, di node grafiknya, di tab Chat, dan di kartunya; biru tidak dipakai untuk hal lain. Tenang, tetapi tidak mungkin terlewat karena satu-satunya warna.
3. **Sudah sampai mana:** bar atas "UI · 7/24 item" + garis progres 96 px; di kepala kolom agent satu baris "batch 2 · 2 jalan · 1 butuh kamu · 4 selesai · 3 siap" sebagai rangkuman komposisi tim.

## Beda dengan arah A dan B
| Aspek | C (ini) | A | B |
|---|---|---|---|
| Struktur | Kolom agent terlebar (288), grafik sedang, Chat 400 | Chat terlebar | Grafik dominan |
| Huruf | Atkinson Hyperlegible Next + Atkinson Hyperlegible Mono | Plus Jakarta Sans + Commit Mono | Overpass + Overpass Mono |
| Suhu warna | Netral, monokrom + satu biru | Hangat krem | Dingin abu kebiruan |
| Kepadatan | Rapat tapi tenang (baris 32) | Rendah (40) | Sedang (36) |
| Grafis | Node teks tanpa kotak (yang Jalan dibalik jadi label bertinta), garis 1 px melengkung | Node pil | Peta jalur |
| Bentuk | Tajam (2/6), hampir tanpa bidang | Bulat lembut | Lingkaran + sudut kecil |

## Referensi
| Referensi | Prinsip yang diambil | Yang TIDAK diambil |
|---|---|---|
| Aplikasi Claude (chat) | Pertanyaan dan izin = pesan; penanda "belum dibaca" yang tenang, bukan alarm | Palet koral, serif, ikon Claude |
| n8n, tampilan eksekusi | Node tersambung garis; yang aktif menyala, sisanya tenang; garis aktif bergerak | Kotak node, ikon node, kanvas grid |
| Linear | Teks sebagai hierarki (bobot, abu); garis dan kotak paling sedikit; daftar padat yang tetap sepi | Tema gelap-ungu, Inter, layout dan ikon Linear (R-30) |
| Flow Viewer v2 (ditolak) | Pelajaran: tanpa kotak bergaris, tanpa banner, node maks 3 info | Semua bentuk kotak dan pita di atas |

Library `~/.claude/design-library/` tidak dibuka; token diturunkan dari konsep dan diuji kontras.

## Dial per jenis area
| Jenis | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | ENERGY / RHYTHM / MOTION | Alasan |
|---|---|---|---|---|---|
| Dashboard | 2 | 2 | 6 | 1 / 1 / 1 | Daftar padat yang seragam disengaja; satu warna jadi sinyal |
| Layar tugas | 2 | 1 | 4 | 1 / 1 / 1 | Teks dan satu aksi; tanpa hiasan |

## Rancangan layar: Layar proyek (layar kunci)
- **Jenis:** dashboard + tugas (Chat). Dial baris Dashboard.
- **Pertanyaan:** apa yang sedang dikerjakan, dan apakah ada yang menunggu saya?
- **Titik fokus:** kartu pertanyaan/izin di Chat, latar biru sangat muda + titik biru. Tanpa yang menunggu: baris teratas kolom agent (yang Jalan, bertinta hitam). Alasan: hanya pesan untukmu yang berwarna.
- **Urutan baca:** 1. kartu menunggu (biru) · 2. baris hitam di kolom agent · 3. "UI · 7/24 item" di bar atas · 4. grafik.
- **Blok (1440: rel 48 | agent 288 | grafik ~704 | Chat 400):**
  - Bar atas 44: nama proyek 18/700 + path abu · status · "UI · 7/24 item" + garis 96 px · token · durasi · [Jeda] [Stop]. Semua satu baris teks.
  - Kolom agent: kepala satu baris rangkuman tim; daftar terurut Butuh kamu, Gagal, Jalan, lalu urutan alur. Baris aktif dua baris (nama 14/700 hitam + "Kerangka layar Riwayat · 6 mnt" 13 abu); baris diam satu baris 32 abu. Tanpa garis antar baris; kelompok dipisah jarak 16.
  - Grafik: nama 14 + kata status 12 di bawahnya, titik 8 px di kiri nama; garis 1 px abu melengkung; garis ke node Jalan 2 px hitam mengalir; node Jalan dibalik (bidang `--ink`, teks `--on-ink`, radius 2) agar "menyala" tanpa menambah warna; node Butuh kamu bertitik biru; node terpilih digaris bawah. Selain node Jalan, tidak ada bidang atau kotak.
  - Chat: permukaan putih; kolom dipisah oleh garis 1 px `--line` (satu-satunya garis vertikal di layar, karena tanpa bidang warna kolom tidak terbaca).
- **Konsep terlihat di:** daftar yang mengurut ulang sendiri, hitam vs abu sebagai status kerja, biru tunggal "untukmu" di empat tempat.
- **Sengaja tidak ada:** warna hijau untuk Jalan (hitam + gerak + kata "Jalan" cukup), bidang latar per kolom, kotak node, banner, kartu KPI, ikon per agent.
- **Keadaan (data asli 07_Sandbox):** prompt bebas, bar atas "Prompt bebas · 9 langkah". (a) pertanyaan warna: orkestrator naik ke atas dengan titik biru, kartu tiga pilihan; (b) izin Write `D:\luar-tes.txt` mono + alasan; (c) Dijeda: orkestrator jadi abu dengan kata "Dijeda", garis berhenti, tombol "Lanjut"; (d) Dihentikan: semua abu, pesan sistem di Chat, kotak ketik diganti "Run dihentikan. Mulai run baru untuk lanjut." + [Run baru].
- **Keadaan berat (data contoh):** baris atas ui-designer bertitik biru; fe dan be hitam dua baris; 4 Selesai dan 3 Siap abu satu baris (semua 10 terlihat tanpa gulir pada tinggi 768).
- **Mobile 375 (HP):** Chat penuh layar. Kepala: kembali, nama, status, [Jeda] [Stop] 44 px; baris "UI · 7/24 item". Baris "Agent: 2 jalan · 1 butuh kamu" terbuka jadi daftar teks yang sama dengan kolom laptop (hitam/abu/biru). Tab bawah disembunyikan; kotak ketik menempel bawah.

## Wujud arah per jenis layar
- **Dashboard · (c) Daftar proyek (layar kunci berikutnya):**
  - Bentuknya kotak masuk. Kepala: angka ringkasan dalam satu baris teks ("Butuh kamu 1" biru, sisanya tinta; angka 0 diciutkan) + [Run baru] hitam.
  - Proyek yang butuh kamu ada paling atas: titik biru + jumlah di kiri nama, dan baris kedua berisi potongan pertanyaan tertua seperti pratinjau pesan. Proyek jalan: nama hitam + "UI · 7/24 · fe, be jalan". Proyek diam: abu, satu baris 32.
  - Tanpa kartu dan tanpa judul bagian besar; kelompok dipisah jarak 16 + label 12 abu. Fokus: titik biru teratas.
  - HP: hampir identik, karena kotak masuk memang pola asli HP; baris 56.
- **Dashboard · Kesehatan kit:** 6 angka 22/700 dalam satu baris teks dengan pembanding abu; masalah ditandai teks merah + ikon, bukan bidang; grafik garis 1 px hitam, periode lalu abu putus-putus.
- **Tugas · (b) Review milestone (layar kunci berikutnya):**
  - Bentuknya daftar + bukti, bukan galeri. Kepala: "Review · UI" + ringkasan teks + [Setujui] hitam + [Kirim perbaikan (n)].
  - Kiri (320): daftar item padat. Item yang belum dilihat ditulis hitam, yang sudah dilihat abu, yang bercatatan perbaikan diberi ikon pensil, dan yang tanpa bukti diberi label "tanpa bukti".
  - Kanan: bukti item terpilih ukuran besar, lalu keterangan, agent, dan kotak catatan perbaikan di bawahnya. Panah atas/bawah pindah item.
  - Konsep: menilai seperti membaca pesan satu per satu sampai kotak masuk bersih.
  - HP: daftar dulu; ketuk item untuk membuka bukti layar penuh, geser untuk item berikutnya; Setujui dan Kirim perbaikan menempel bawah.
- **Tugas · Run baru:** kotak ketik putih bergaris 1 px di tengah latar nyaris putih; chip perintah sebagai teks bergaris bawah saat terpilih; Mulai tombol hitam.
- **Tugas · Riwayat:** tabel padat 32 tanpa garis vertikal.
- **HP umum:** semua daftar memakai bahasa yang sama (hitam kerja, abu diam, biru untukmu).

## Warna (peran, terang / gelap)
| Token | Terang | Gelap | Peran |
|---|---|---|---|
| `--bg` | #FAFAF8 | #19191A | latar, kolom agent, kanvas grafik |
| `--surface` | #FFFFFF | #202022 | Chat, popover, kotak ketik |
| `--sunk` | #F1F1EE | #141415 | rel, hover, blok mono |
| `--line` | #E6E6E2 | #333336 | pemisah kolom Chat, bawah bar atas |
| `--edge` | #8A8A85 | #77777C | garis grafik, batas tombol (3:1) |
| `--text` / `--text-2` / `--text-3` | #111110 / #4F4F4B / #6A6A65 | #F3F3F1 / #BDBDB8 / #9C9C97 | kerja dan utama / sekunder / diam |
| `--ink` | = `--text` | = `--text` | tombol utama, Jalan, garis aktif |
| `--ask` / `--ask-soft` | #1F4FD1 / #E6EDFC | #8FB0FF / #1C2745 | "untukmu": titik, teks, latar kartu menunggu |
| `--bad` / `--bad-soft` | #B42318 / #FBE4E1 | #FF8F85 / #3A1C1A | Gagal, Terputus, masalah Kesehatan kit |

Aturan: satu aksen = **biru untukmu**. Jalan dibedakan dengan tinta hitam penuh + titik terisi + kata, Siap/Selesai abu + cincin/centang (F4: warna dan ikon/teks tetap berbeda). Merah hanya untuk gagal. Gelap = grafit, bukan hitam pekat.

## Tipografi
- **Atkinson Hyperlegible Next** (400, 700) untuk semua teks: dirancang Braille Institute untuk keterbacaan sekilas (I, l, 1 dan O, 0 dibedakan), cocok untuk dilirik dari jauh dan dibaca di HP. **Atkinson Hyperlegible Mono** (400) untuk path, perintah, nama alat; pasangan dari keluarga yang sama.
- Skala: 12 / 13 / 14 / 16 / 18 / 22. Teks UI 14; Chat 16; nama proyek 18; angka Kesehatan kit 22.
- Line-height 1.45 (Chat 1.55), judul 1.2. Angka `tabular-nums`. Dua bobot saja (400, 700): hierarki dari bobot + abu.

## Spasi, layout, bentuk
- Skala 4: 4 · 8 · 12 · 16 · 24 · 32. Baris diam 32, baris aktif 52; jarak antar kelompok 16; padding Chat 16 horizontal, 24 antar pesan.
- Breakpoint menurut isi: ≥ 1280 penuh; 1024-1279 grafik menyempit dulu (kolom agent dan Chat tetap, karena keduanya inti konsep); < 900 tata letak HP.
- Radius: 2 (tombol, chip, input), 6 (kartu Chat, popover). Bayangan: hanya popover.
- Garis: 1 px `--line` di bawah bar atas dan di kiri Chat; tidak ada garis lain.

## Komponen inti
- **Baris agent:** titik 8 (Jalan terisi hitam, untukmu terisi biru, Gagal silang merah, Siap cincin abu, Selesai centang abu) + nama + kata status rata kanan 12. Baris aktif menambah item + lama kerja.
- **Node grafik:** titik + nama 14 + kata status 12 (+ "x3"). Tanpa bidang, kecuali node Jalan yang dibalik (bidang tinta, teks terang); fokus/terpilih = garis bawah 2 px tinta.
- **Kartu pertanyaan/izin:** latar `--ask-soft`, radius 6, titik biru + "orkestrator · dari ui-designer" 12; pertanyaan 16/700; pilihan = tombol garis 2 radius dengan keterangan 13. Izin: blok mono `--sunk`.
- **Kartu terjawab, pesan sistem:** satu baris 13 `--text-3`.

## Motion
120-200 ms ease-out untuk interaksi; urut ulang baris agent dianimasikan 250 ms (transform) agar mata mengikuti siapa yang naik. Satu gerak terus-menerus: aliran putus-putus pada garis ke node Jalan (1,2 dtk). Titik biru tidak berdenyut. `prefers-reduced-motion`: urut ulang instan, garis diam.

## Istilah & nada
- Run, Proyek, Folder kerja, Butuh kamu, Pertanyaan, Izin, Milestone, Batch, Bukti (UX.md 10).
- "untukmu" hanya nama konsep di dokumen ini; di layar selalu "Butuh kamu" (istilah UX).
- Status: Jalan · Butuh kamu · Siap · Selesai · Gagal · Dilewati · Dijeda · Jeda limit · Siap review · Dihentikan · Terputus.
- Kendali: Jeda · Lanjut · Stop · Lanjutkan. Izin: Setujui · Tolak · Selalu setujui.
- Sapaan "kamu"; tanpa tanda seru; tombol 1-3 kata; waktu "14.37"; token "1,2 rb". Penanda "1 menunggu kamu ↓".

## Larangan khusus
- Biru hanya untuk "untukmu"; tidak untuk tautan atau tombol (tautan = tinta bergaris bawah).
- Tidak ada bidang warna per kolom, kotak node, banner, kartu KPI.
- Data contoh selalu berlabel.

## Pelanggaran disengaja
| Temuan audit | Di mana | Alasan |
|---|---|---|
| titik-fokus: 10 tombol berlatar solid di layar pertama (sedang) | Layar proyek: tiga pilihan di kartu pertanyaan (latar putih di atas biru muda), Jeda/Stop/Kirim pesan bergaris, Run baru di rel | Hanya Run baru (rel, 32 px) dan Kirim pesan yang bertinta penuh; sisanya permukaan putih. Pilihan jawaban harus terbaca sebagai tombol di dalam kartu fokus |
| copy-tombol: label tombol 6-9 kata (rendah) | Baris agent dan pilihan jawaban | Baris agent adalah baris daftar yang bisa diklik (nama + status + item), dan pilihan memuat keterangan 13 px sesuai pola AskUserQuestion |
| Gerak terus-menerus | Garis putus-putus ke node Jalan | Menandai kerja yang sedang berlangsung (keadaan nyata), berhenti saat Jeda/Stop dan pada `prefers-reduced-motion` |

Token ditambahkan saat membangun Layar proyek (2026-11-04): `--progress-w` 96, `--progress-h` 2, `--ctl-h` 28, `--rail-btn` 32. Titik status memakai `clip-path: circle(50%)`, bukan radius ketiga.

## Decision log
| Tanggal | Perubahan | Alasan |
|---|---|---|
| 2026-11-04 | Arah C ditulis (konsep-3) | Brief pemilik: Claude, n8n, Linear; tolak v2 |
| 2026-11-04 | Dibangun: `layar-proyek.html` desktop 1440 (keadaan lewat hash: #berat bawaan, #a, #b, #c, #d) | Perintah "bangun arah C" |
| 2026-11-04 | Dilengkapi: blok kesan, wujud layar (b) Review dan (c) Daftar proyek + HP; node Jalan dibalik agar menyala | Brief pemilik: tiap arah menjawab semua kesan; layar kunci tahap berikutnya |
