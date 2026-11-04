# DESIGN · Arah A "Meja percakapan"

Status: Draft (konsep-3, menunggu pemilik memilih) · 2026-11-04
Token mesin: `docs/mockups/arah-a/tokens.css` · Data mockup: `docs/mockups/data-mockup.md`

## Kesan (3 kata)
**tenang · hidup · akrab** (asumsi, minta konfirmasi). Diturunkan dari referensi pemilik: tenang (Linear, data banyak tetap sepi), hidup (n8n, hanya node aktif menyala), akrab (aplikasi Claude, pertanyaan terasa seperti percakapan, bukan alarm).

## Konsep
Crew Control terasa seperti **duduk di meja bersama mandor yang melapor lewat obrolan**, karena pemilik hanya dibutuhkan saat diajak bicara (pertanyaan, izin, review); ini terlihat dari **Chat sebagai kolom terlebar dengan kertas paling terang**, **daftar agent tanpa kotak (teks + lampu kecil)**, dan **grafik abu-abu yang hanya berwarna di agent yang sedang kerja**.

## Cara arah ini menjawab ketiga kesan
- **Tenang:** kolom dipisah warna latar, bukan garis; warna hanya muncul pada yang hidup atau menunggu; daftar agent berupa kalimat, bukan kartu.
- **Hidup:** hijau hanya untuk yang sedang kerja; garis putus-putus mengalir menuju node Jalan; sisanya abu dan diam.
- **Akrab:** Chat adalah kolom terlebar dan satu-satunya "kertas"; pertanyaan dan izin tampil sebagai pesan berlatar amber muda, bukan peringatan; huruf berbentuk terbuka (Plus Jakarta Sans).

## Jawaban untuk 3 pertanyaan pemilik
1. **Siapa yang kerja (3 detik):** kolom kiri diurut Butuh kamu, Jalan, lalu sisanya; baris Jalan memakai teks tebal + lampu hijau, sisanya abu. Di grafik, hanya node Jalan dan garis menuju node itu yang berwarna.
2. **Ada yang nanya:** kartu pertanyaan di Chat berlatar amber muda, satu-satunya bidang berwarna di layar; baris agent itu ikut bertanda "Butuh kamu"; di atas kotak ketik muncul "1 menunggu kamu ↓" bila kartunya tergulir keluar.
3. **Sudah sampai mana:** bar atas kiri, satu kalimat "UI · 7 dari 24 item · batch 2" dan di tepi bawah bar atas satu garis 24 ruas (selesai = tinta, jalan = hijau, sisa = garis).

## Beda dengan arah B dan C
| Aspek | A (ini) | B | C |
|---|---|---|---|
| Struktur | Chat terlebar (440); grafik sedang | Grafik dominan | Kolom agent terlebar |
| Huruf | Plus Jakarta Sans + Commit Mono | Overpass + Overpass Mono | Atkinson Hyperlegible Next + Mono |
| Suhu warna | Hangat (kertas krem) | Dingin (abu kebiruan) | Netral, nyaris monokrom |
| Kepadatan | Rendah (baris 40) | Sedang (36) | Rapat tapi tenang (32) |
| Grafis | Node pil lembut, garis rambut | Peta jalur: stasiun bulat, garis tebal | Node teks tanpa kotak |
| Bentuk | Bulat lembut (8/14/20) | Lingkaran + sudut kecil (4/8) | Tajam (2/6) |

## Referensi
| Referensi | Prinsip yang diambil | Yang TIDAK diambil |
|---|---|---|
| Aplikasi Claude (chat) | Pertanyaan dan izin = pesan dalam alur percakapan; pesan pemilik di kanan, agent di kiri tanpa gelembung berat; kotak ketik selalu di bawah | Palet krem-koral dan serif judul Claude; logo/ikon bintang |
| n8n, tampilan eksekusi | Node tersambung garis; node aktif menyala, sisanya tenang; garis aktif bergerak | Kartu node berikon besar, kanvas bertitik-grid, warna per jenis node |
| Linear | Teks sebagai hierarki (bobot dan abu, bukan kotak); garis pemisah minimum | Tema gelap-ungu Linear, huruf Inter, tata letak sidebar Linear (R-30) |
| Flow Viewer v2 (ditolak) | Pelajaran: satu kotak = satu masalah; node maks 3 info | Banner di atas, semua bergaris, kartu node 7 isi, padat merata |

Library `~/.claude/design-library/` tidak dibuka: nilai token diturunkan dari konsep lalu diuji kontras (lihat Warna).

## Dial per jenis area
| Jenis | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | ENERGY / RHYTHM / MOTION | Alasan |
|---|---|---|---|---|---|
| Dashboard (Layar proyek, Daftar proyek, Kesehatan kit, HP) | 3 | 2 | 4 | 1 / 2 / 1 | Dilirik sepintas; satu hal bergerak (yang jalan), sisanya diam |
| Layar tugas (Run baru, Review milestone, Riwayat) | 3 | 2 | 3 | 1 / 2 / 1 | Satu aksi per layar; ruang lega seperti kertas kosong |

## Rancangan layar: Layar proyek (layar kunci)
- **Jenis:** dashboard + tugas (Chat). Dial baris Dashboard.
- **Pertanyaan:** apa yang sedang dikerjakan, dan apakah ada yang menunggu saya?
- **Titik fokus:** kartu pertanyaan/izin yang belum dijawab (amber muda, di Chat). Tanpa yang menunggu: pesan agent terakhir di Chat. Alasan: keputusan pemilik terjadi di percakapan.
- **Urutan baca:** 1. kartu menunggu di Chat · 2. agent bertinta tebal di kolom kiri (siapa kerja) · 3. kalimat progres di bar atas · 4. grafik.
- **Blok (laptop 1440, rel 56 | agent 208 | grafik sisa ~736 | Chat 440):**
  - Bar atas 48: nama proyek + path abu · status (ikon + teks) · kalimat progres · token · durasi · [Jeda] [Stop]; garis 24 ruas di tepi bawah (progres sebagai panjang, bukan angka saja).
  - Kolom agent: tanpa judul kotak; tiap baris = lampu 8 px + nama + status kata; baris Jalan menambah satu baris abu "item yang dikerjakan". Selesai dan Siap dikelompokkan di bawah dengan jarak 24, bukan garis.
  - Grafik: kanvas warna latar (bukan putih), node pil (nama + kata status + "x3" bila putaran > 1); garis rambut abu; garis ke node Jalan hijau dengan putus-putus bergerak. Tombol Grafik/Timeline + pas layar di pojok kanan bawah kanvas, kecil.
  - Chat: permukaan paling terang (satu-satunya "kertas"), dipisah dari grafik oleh perubahan warna latar, bukan garis. Tab Chat | Detail agent di kepala Chat.
- **Konsep terlihat di:** Chat paling lebar dan terang; warna hanya pada yang hidup (lampu, garis aktif, kartu menunggu); kolom kiri berupa kalimat, bukan kartu.
- **Sengaja tidak ada:** banner, kartu KPI, bingkai di sekitar kolom, ikon per agent, kanvas bertitik, warna per jenis agent, kedip pada yang bertanya.
- **Keadaan (data asli 07_Sandbox):** (a) 14.37 pertanyaan "Warna apa untuk file warna.txt?" dengan tiga tombol pilihan + keterangannya; orkestrator di kiri bertanda Butuh kamu. (b) izin Write `D:\luar-tes.txt` mono + "Path di luar folder proyek" + [Setujui] [Tolak] [Selalu setujui]. (c) Dijeda: status "Dijeda" + tombol Jeda berganti "Lanjut", lampu orkestrator berhenti bergerak, kotak ketik "Pesanmu terkirim saat Lanjut". (d) Dihentikan: pesan sistem di tengah, Jeda/Stop hilang, kotak ketik tetap (bisa lanjut obrolan bila run terakhir Selesai; Dihentikan = baca saja sesuai A13, kotak ketik diganti "Run dihentikan. Mulai run baru untuk lanjut." + [Run baru]).
- **Keadaan berat (data contoh):** 10 agent; ui-designer di baris teratas (amber), fe dan be tebal + lampu hijau dengan item masing-masing; grafik bercabang dua hijau paralel; kartu pertanyaan "dari ui-designer" di Chat.
- **Mobile 375 (HP):** Layar proyek = Chat penuh layar. Kepala 56: kembali "Proyek", nama, status; baris kedua kalimat progres + garis 24 ruas. Di bawahnya satu baris "Agent: 2 jalan · 1 butuh kamu" yang dibuka jadi daftar teks. Jeda dan Stop di kepala sebagai tombol teks 44 px. Tab bawah disembunyikan di layar ini; kotak ketik menempel bawah dengan safe area.

## Wujud arah per jenis layar
- **Dashboard · (c) Daftar proyek (layar kunci berikutnya):**
  - Kepala: judul "Proyek", angka ringkasan sebagai satu kalimat ("1 butuh kamu · 1 siap review · 1/1 jalan"; angka 0 diciutkan), [Run baru] tinta di kanan. Tanpa kartu angka.
  - "Perlu diurus" di atas: tiap proyek yang menunggu adalah satu bidang amber muda berisi nama, path abu, dan potongan pertanyaan tertua seperti pratinjau pesan. Bidang ini satu-satunya titik fokus. Di bawahnya "Jalan": kalimat progres + garis ruas mini + agent aktif. Paling bawah "Diam": satu baris abu per proyek. Kelompok dipisah jarak 32, bukan garis.
  - HP: susunan sama dalam satu kolom, baris minimal 56, kalimat ringkasan boleh dua baris.
- **Dashboard · Kesehatan kit:** 6 angka berderet sebagai teks 24 + pembanding abu; masalah ditandai teks merah + ikon; grafik garis tipis satu warna tinta, periode lalu abu putus-putus.
- **Tugas · (b) Review milestone (layar kunci berikutnya):**
  - Kepala: "Review · UI" + satu kalimat ringkasan (jumlah item, jumlah tanpa bukti, token dan waktu dibanding milestone sejenis); [Setujui] tinta dan [Kirim perbaikan (n)] bergaris di kanan.
  - Galeri: kartu kertas putih di atas latar krem, 3 kolom di 1440. Ukuran kartu seragam karena isinya sejenis dan dibandingkan berdampingan. Gambar dominan (16:10), lalu judul item, satu kalimat keterangan bukti, dan nama agent. Item tanpa bukti: kartu sama besar berisi ringkasan teks dan label "tanpa bukti" + ikon abu (bukan amber, karena amber hanya untuk Butuh kamu). "Minta perbaikan" berupa tautan teks yang membuka kotak catatan di dalam kartu.
  - Konsep: membaca lampiran yang dikirim mandor; setelah Setujui, pemilik kembali ke Chat dengan pesan sistem.
  - HP: satu kolom kartu; Setujui dan Kirim perbaikan menempel di bawah layar.
- **Tugas · Run baru:** satu kertas putih lebar di tengah (kotak ketik 3-12 baris) di atas latar krem, chip perintah di atas, tombol folder/tim/model berupa teks bergaris bawah di bawahnya; Mulai = tombol tinta.
- **Tugas · Riwayat:** tabel tanpa garis vertikal, baris 40, status = lampu + kata.
- **HP umum:** semua layar satu kolom kertas; tab bawah 3 tujuan berupa ikon + teks.

## Warna (peran, terang / gelap)
| Token | Terang | Gelap | Peran |
|---|---|---|---|
| `--bg` | #F5F2EC | #1C1A17 | latar halaman, kanvas grafik, kolom agent |
| `--surface` | #FFFDF9 | #24211D | Chat, popover, kotak ketik (kertas) |
| `--sunk` | #ECE7DE | #161412 | rel navigasi, hover baris |
| `--line` | #E0D9CD | #37332D | pemisah halus (dekoratif, bukan batas kontrol) |
| `--edge` | #8F8778 | #7C7568 | garis grafik, batas tombol sekunder (3:1) |
| `--text` / `--text-2` / `--text-3` | #24211C / #57514A / #6A6358 | #F2EDE4 / #C9C1B4 / #A9A193 | utama / sekunder / redup (semua ≥ 4,8:1) |
| `--ink` | = `--text` | = `--text` | tombol utama (aksi), fokus |
| `--run` / `--run-soft` | #2D7549 / #E1EEE3 | #7CC696 / #1E3325 | status Jalan, garis aktif |
| `--ask` / `--ask-mark` / `--ask-soft` | #9A4D06 / #C46A0A / #FBEAD3 | #F2AA55 / #F2AA55 / #3B2B15 | Butuh kamu: teks / lampu / latar kartu menunggu |
| `--bad` / `--bad-soft` | #B0281F / #F8E0DC | #F2918A / #3E1F1C | Gagal, Terputus |

Aturan: aksen yang disengaja = **amber Butuh kamu** (satu-satunya bidang berwarna). Aksi utama memakai tinta, bukan warna. Selesai = centang abu (`--text-3`), bukan hijau, supaya hijau hanya berarti "sedang kerja". Status selalu ikon + teks. Tema gelap = arang hangat (bukan hitam), dipakai bila sistem/pemilik memilih (F13).

## Tipografi
- **Plus Jakarta Sans** (400, 600, 700) untuk semua teks: dirancang di Jakarta, bentuknya terbuka dan ramah, cocok untuk nada "akrab" dan teks berbahasa Indonesia. **Commit Mono** (400) hanya untuk path, perintah, dan nama alat di kartu izin dan langkah alat.
- Skala: 12 / 13 / 14 / 16 / 20 / 24. Teks UI 14; teks Chat 16 (percakapan dibaca, bukan dipindai); judul proyek 20; angka besar 24 (Kesehatan kit).
- Line-height 1.5 (Chat 1.6), judul 1.25. Angka `tabular-nums`. Sentence case; tanpa huruf kapital berjarak lebar.

## Spasi, layout, bentuk
- Skala 4: 4 · 8 · 12 · 16 · 24 · 32 · 48. Baris agent 40; jarak antar kelompok 24; padding Chat 24.
- Ukuran kontrol (ditambah saat bangun arah A): `--ctl-h` 32 (tombol, tab, node), `--ctl-h-l` 40 (ikon rel, node orkestrator), `--node-h` 32, `--icon` 20, `--icon-s` 16, `--seg-h` 4 (garis 24 ruas).
- Breakpoint menurut isi: ≥ 1200 tiga kolom penuh; 900-1199 kolom agent menyempit jadi lampu + nama (item disembunyikan) dan Chat 380; < 900 tata letak HP.
- Radius: 8 (tombol, chip, node), 14 (kartu Chat, popover), 20 (gelembung pesan pemilik). Bayangan: hanya popover/menu (`--shadow-pop`) dan kotak ketik melayang di HP (`--shadow-lift`).
- Garis: hairline 1 px `--line` hanya di bawah bar atas; kolom dipisah warna latar.

## Komponen inti
- **Baris agent:** lampu 8 px (Jalan hijau, Butuh kamu amber, Gagal merah, Siap/Selesai cincin abu) + nama 14/600 bila Jalan atau Butuh kamu, 14/400 abu bila tidak + kata status 13. Klik membuka Detail agent.
- **Node grafik:** pil 8 radius, isi maks 3: nama · kata status · putaran. Node Jalan berlatar `--run-soft` dan teks `--run`; Butuh kamu berlatar `--ask-soft`; lainnya tanpa latar, hanya garis `--edge`.
- **Kartu pertanyaan:** latar `--ask-soft`, radius 14, pengirim "orkestrator" (+ "dari ui-designer"), pertanyaan 16/600, pilihan sebagai tombol bergaris dengan keterangan 13 di bawah label. Kartu izin: sama, ditambah blok mono.
- **Kartu terjawab:** menciut jadi satu baris abu 13: "Warna apa untuk file warna.txt? → Biru · kamu, 14.37".
- **Pesan sistem:** teks 13 abu di tengah, tanpa gelembung.

## Motion
120-200 ms ease-out untuk hover/menciutnya kartu. Satu gerak terus-menerus: putus-putus mengalir di garis menuju node Jalan (1,2 dtk, linear), sebagai tanda run hidup. Butuh kamu tidak berkedip (bukan alarm). `prefers-reduced-motion`: garis diam, hanya warna.

## Istilah & nada
- Run, Proyek, Folder kerja, Butuh kamu, Pertanyaan, Izin, Milestone, Batch, Bukti (UX.md bagian 10).
- Status: Jalan · Butuh kamu · Siap · Selesai · Gagal · Dilewati · Dijeda · Jeda limit · Siap review · Dihentikan · Terputus.
- Kendali: Jeda · Lanjut · Stop · Lanjutkan. Izin: Setujui · Tolak · Selalu setujui.
- Sapaan "kamu"; tanpa tanda seru; tombol 1-3 kata; waktu "14.37"; token "1,2 rb".
- Penanda: "1 menunggu kamu ↓" (panah = arah lompat, bukan hiasan).
- Kotak ketik: "Tulis ke orkestrator"; saat jalan: "Pesan masuk setelah langkah yang sedang jalan selesai."; saat dijeda: "Pesanmu terkirim saat Lanjut."

## Larangan khusus
- Tidak ada banner, kartu KPI, atau kotak di sekitar kolom.
- Hijau hanya untuk Jalan; amber hanya untuk Butuh kamu.
- Node grafik maks 3 isi.
- Data contoh (keadaan berat) selalu berlabel "Data contoh".

## Pelanggaran disengaja
| Temuan audit | Di mana | Alasan |
|---|---|---|
| titik-fokus sedang: 10 tombol berlatar solid di layar pertama | Layar proyek: tab aktif, rel aktif, 3 pilihan jawaban, node Jalan/Butuh kamu | Pilihan jawaban adalah tombol kertas di atas kartu amber (satu kelompok, satu keputusan); node berwarna adalah status, bukan aksi. Satu-satunya aksi tinta di layar: kirim pesan dan Run baru di rel |
| copy-tombol rendah: tombol pilihan 5-8 kata | Kartu pertanyaan | Label 1-3 kata + keterangan pilihan dari AskUserQuestion; audit menggabung keduanya |
| kandidat fokus audit = h1 "toconnect" | Bar atas | Audit mengukur bobot teks; secara visual bidang amber kartu menunggu (satu-satunya bidang berwarna, ~440x300) terbaca pertama |

## Decision log
| Tanggal | Perubahan | Alasan |
|---|---|---|
| 2026-11-04 | Arah A ditulis (konsep-3) | Brief pemilik: Claude, n8n, Linear; tolak v2 |
| 2026-11-04 | Bangun arah A: `layar-proyek.html` (1440, 5 keadaan lewat #a #b #c #d #berat) | Orkestrator ditaruh sebagai baris pertama kolom agent (model di baris kedua), di luar hitungan "10 agent"; status bar atas = status run, "n menunggu kamu" terpisah; lampu tidak bergerak (satu gerak terus-menerus hanya garis aktif); Grafik/Timeline dan pas layar belum dimockup |
| 2026-11-04 | Dilengkapi: blok kesan, wujud layar (b) Review dan (c) Daftar proyek + HP | Brief pemilik: tiap arah menjawab semua kesan; layar kunci tahap berikutnya |
