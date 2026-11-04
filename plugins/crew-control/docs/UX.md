# UX Crew Control
Versi 1 · 2026-11-04 · Sumber: `docs/PRD.md` v0.9 (wireframe bagian 6), `docs/KEPUTUSAN.md` (API dan event irisan tipis), data asli `data/crew.db` (2 run uji), masukan pemilik setelah mencoba irisan tipis. Bahasa UI: id.

## 1. Ringkasan untuk pemilik
- **Tugas utama:** mulai run, jawab pertanyaan dan izin, review milestone, pantau proyek, nilai kesehatan kit, buka run lama.
- **Langkah:** mulai run di folder yang sama dengan kemarin 8 -> 3 langkah (buka, ketik, Enter); jawab pertanyaan atau izin dari HP 2 langkah; lanjut backlog per batch dari 3 langkah tiap batch (`/clear`, perintah, Enter) -> 0; setujui milestone 2 langkah.
- **Seperti aplikasi Claude (permintaan Anda):** Run baru adalah satu kotak ketik besar. Di bawahnya ada tombol folder, tim, dan model. Folder dibuka dari folder kerja (`D:\01_Workspace`). Anda bisa masuk ke folder di bawahnya sedalam apa pun, dan tidak bisa naik di atas folder kerja. Model dipilih dari daftar, bukan diketik. Enter mengirim, Shift+Enter membuat baris baru. Pertanyaan, izin, dan usulan milestone tampil sebagai kartu di Chat dengan tombol Setujui, Tolak, dan Selalu setujui.
- **Keputusan besar:** pilihan folder, model, dan perintah terakhir diingat, jadi run berikutnya cukup diketik. Halaman awal hanya menjawab "proyek mana yang butuh saya", dengan proyek yang menunggu Anda selalu di atas. Kesehatan kit dibuka dengan 6 angka beserta pembandingnya. Tabelnya hanya rincian.
- **Perlu persetujuan (ya/tidak):**
  1. *Usulan perubahan PRD:* tambahkan **pilihan model** ke Run baru dan simpan model per run. Saat ini PRD belum menyebutnya. Rekomendasi: **ya**, Anda yang memintanya dan server sudah mendukung.
  2. **Run boleh dimulai di folder kerja itu sendiri** (bukan subfolder). Akibatnya, izin otomatis berlaku untuk seluruh isi folder kerja, dan layar akan menampilkan peringatan satu baris. Rekomendasi: **ya**, dengan folder bawaan = folder terakhir, bukan folder kerja.
  3. *Usulan perubahan PRD:* run terakhir sebuah proyek yang sudah **Selesai tetap bisa dilanjut dengan mengetik**, seperti chat Claude. Run lama yang dibuka dari Riwayat tetap baca saja. Rekomendasi: **ya**, irisan tipis sudah bekerja begini.
- **Pertanyaan bisnis:** tidak ada. Ambang masalah di Kesehatan kit (mis. "menunggu Anda > 30 menit") adalah asumsi awal yang bisa diubah (bagian 11).

## 2. Tugas dan langkah (layar tugas)
Langkah = klik, ketuk, isi satu kotak, atau satu tombol keyboard. Perhitungan ada di bagian 8.

| Tugas | Langkah awal (irisan tipis / cara sekarang) | Langkah rancangan | Apa yang dihapus |
|---|---|---|---|
| T1 Mulai run, folder sama dengan run terakhir | 8 (folder dan model dipilih ulang tiap kali: Ganti folder, masuk 2 tingkat, Pilih, buka model, pilih, ketik, Mulai) | **3** (Run baru, ketik, Enter) | Pilih ulang folder dan model: diingat |
| T1b Mulai run di folder 2 tingkat lebih dalam yang belum pernah dipakai | 8 | **6** (Run baru, tombol folder, masuk 1 tingkat, Pilih di baris folder, ketik, Enter) | Tombol "Pilih folder ini" terpisah: tiap baris punya Pilih |
| T1c Mulai run di folder yang pernah dipakai | 8 | **5** (Run baru, tombol folder, pilih dari "Terakhir dipakai", ketik, Enter) | Menjelajah ulang |
| T2 Lanjut backlog sampai milestone selesai (12 item, batch 5) | 9 (3 batch x `/clear` + perintah + Enter, di aplikasi Claude) | **3** sekali di awal (Run baru, chip "Lanjut backlog", Enter) + 1 (setujui usulan milestone); per batch **0** | `/clear` dan perintah per batch |
| T3 Jawab pertanyaan berpilihan (satu pertanyaan) | harus di laptop, buka aplikasi Claude | **2** (ketuk notifikasi, ketuk pilihan) | Membuka laptop; tombol Kirim untuk satu pilihan |
| T4 Setujui izin | harus di laptop | **2** (ketuk notifikasi, Setujui) | idem |
| T4b Tolak izin dengan alasan | 3 di irisan (isi alasan, Tolak) + buka layar | **4** (notifikasi, Tolak, ketik alasan, Enter) | Kotak alasan tidak lagi tampil terus di tiap kartu izin |
| T5 Setujui milestone | baca teks "tes lulus" di chat, ketik balasan | **2** (ketuk notifikasi Siap review, Setujui) | Membaca log untuk menilai |
| T5b Minta perbaikan untuk 2 item | ketik catatan panjang di chat | **6** (notifikasi, 2 x [Minta perbaikan di kartu, ketik catatan], Kirim perbaikan) | Menyebut nama item manual |
| T6 Cari agent paling boros di milestone terakhir | evaluasi manual (EVALUASI-KIT) | **2** (Kesehatan kit, klik angka "Agent paling boros") | Menghitung manual dari transkrip |
| T7 Banding token dua run | tidak ada | **4** (Riwayat, centang 2 baris, Banding) | |
| T8 Hentikan run | 1 di irisan | **2** (Stop, Hentikan di konfirmasi) | Ditambah 1 konfirmasi: Stop menghentikan run panjang, dan salah klik mahal |

## 3. Penggolongan layar
| Layar | Jenis | Skill dan referensi yang dipakai |
|---|---|---|
| Daftar proyek (`/`) | Dashboard | `dashboard-design`; ux-designer 18, 21, 05 |
| Run baru | Layar tugas (form satu layar ala kotak ketik Claude) | `ux-designer`; 05, 06, 07, 14 (Prompt UX), 16 |
| Layar proyek | Dashboard (bar atas, kolom agent, grafik) + layar tugas (Chat: jawab, izin, pesan) | `dashboard-design` + `ux-designer`; 05, 06, 14, 18 |
| Review milestone | Layar tugas (menilai lalu Setujui/Minta perbaikan), dengan ringkasan angka di atas | `ux-designer` + `dashboard-design` (ringkasan); 05, 06, 07, 21 |
| Kesehatan kit | Dashboard | `dashboard-design`; 18, 21, 05 |
| Riwayat | Layar tugas (cari satu run, banding dua run); tabel penuh sah karena pertanyaannya "cari satu baris" | `ux-designer`; 21, 05, 16 |
| HP | Versi sempit dari layar di atas: Daftar proyek (dashboard), Chat dan Review (tugas) | sama dengan layar asal; ux-designer 05 (navigasi bawah) |

Koreksi atas PRD: tabel Layar di PRD belum punya kolom Jenis, jadi penggolongan di atas dibuat di sini. Tidak ada layar pemasaran.

## 4. Peta layar dan navigasi
```
/                      Daftar proyek (beranda)
/baru                  Run baru               (?folder=<path> bila dibuka dari proyek)
/proyek/<id>           Layar proyek           (run aktif, atau run terakhir proyek itu)
/proyek/<id>/review    Review milestone       (milestone Siap review terakhir; ?m=<id> untuk yang lain)
/riwayat               Riwayat                (?proyek= &status= &q=)
/riwayat/<runId>       Run lama, baca saja    (tata letak Layar proyek, tanpa kendali)
/riwayat/banding?a=&b= Banding dua run
/kesehatan             Kesehatan kit          (?proyek= &tim= &dari= &sampai=)
```
- **Laptop: rel navigasi kiri yang sempit, selalu tampil.** Isinya: Run baru (aksi utama), Proyek (lencana jumlah "butuh kamu" dari semua proyek), Riwayat, Kesehatan kit, Pengaturan. Alasannya, Layar proyek sudah memakai tiga kolom, jadi navigasi global harus sempit. Navigasi utama di desktop tidak disembunyikan di balik hamburger (ref 05).
- **HP: bilah tab bawah dengan 3 tujuan:** Proyek (lencana), Run baru, Riwayat. Kesehatan kit tidak ada di HP karena PRD F11 tidak memasukkannya dan PRD melarang grafik lengkap di HP. Pengaturan dibuka dari ikon di kepala Daftar proyek.
- **Di mana saya:** judul tiap layar = nama entitasnya. Layar proyek berjudul nama folder, dengan path relatif dari folder kerja di bawahnya ("clients › toconnect"). Path relatif membedakan dua folder yang bernama sama. Review berjudul "Review · <nama milestone>", dan run lama berjudul dari prompt atau perintahnya. Jalan kembali: tautan nama proyek di Review dan di run lama.
- **Pengaturan** adalah panel samping, bukan layar baru. Isinya diambil dari entitas Pengaturan di PRD: tema, bunyi, pemberitahuan (Aktifkan), folder kerja (hanya dibaca, karena ditetapkan lewat env), dan ukuran batch bawaan.

## 5. Pola per tugas
| Tugas / elemen | Pola | Alasan |
|---|---|---|
| Run baru | Halaman penuh berisi satu kotak ketik besar, mirip layar chat baru Claude | Pemilik minta "kaya claude apps"; ref 14 Prompt UX; membuat entitas = halaman penuh |
| Pilih folder | Popover dari tombol folder (laptop), lembar bawah (HP) | Konteks kotak ketik tetap terlihat; pilihan bisa diselesaikan dalam 1-3 klik |
| Pilih model, tim | Menu tarik-turun dari tombol di bawah kotak ketik; tiap pilihan berisi nama + satu baris keterangan dari `/api/config` | Memilih, bukan mengetik (permintaan pemilik) |
| Perintah tim (Mulai dari ide / Lanjut backlog / Prompt bebas) | Chip di atas kotak ketik, satu terpilih; daftarnya dari definisi tim (F1) | Terlihat tanpa membuka menu; jumlahnya sedikit |
| Pertanyaan agent | Kartu di alur Chat. Satu pertanyaan pilihan tunggal: ketuk pilihan langsung mengirim. Banyak pertanyaan atau multi-pilih: satu kelompok per pertanyaan + "Lainnya" (ketik sendiri) + Kirim jawaban | Seperti kartu AskUserQuestion di Claude; langkah minimum untuk kasus paling sering |
| Izin | Kartu di Chat: nama alat + ringkasan (perintah/path) + alasan ditanya; tombol Setujui (utama), Tolak, Selalu setujui | Keputusan cepat 1-3 pilihan; ref 14 Human-in-the-loop |
| Tolak dengan alasan | Tolak membuka kotak alasan di dalam kartu (fokus otomatis); Enter mengirim, kosong = tolak tanpa alasan | Alasan tetap opsional (PRD F5); salah tolak tidak terjadi dalam satu klik |
| Selalu setujui | Satu klik, lalu pesan sistem "Aturan disimpan untuk proyek ini: <alat/pola>" dengan tombol Batalkan | Tanpa konfirmasi, tetapi bisa dibatalkan (ref 14: undo untuk aksi otomatis) |
| Usulan milestone (F3) | Kartu di Chat: nama milestone, jumlah item, daftar judul item (dilipat setelah 5); Setujui / Ubah (Ubah = isi kotak ketik dengan "Ubah milestone: ") | Semua "butuh kamu" ada di Chat (keputusan PRD) |
| Stop | Konfirmasi kecil menempel di tombol (bukan modal layar penuh): "Hentikan run? Pekerjaan yang belum di-commit tetap di folder." [Hentikan] [Batal] | Aksi berat yang bisa dipulihkan dengan Lanjutkan; cukup satu konfirmasi ringan |
| Jeda / Lanjut | Satu tombol yang berganti label, tanpa konfirmasi | Bisa dibalik |
| Detail agent | Tab di kolom kanan (PRD F4) | Grafik tetap terlihat |
| Bukti ukuran penuh | Modal lihat-penuh dengan Sebelumnya/Berikutnya dan Esc untuk menutup | Menilai tanpa kehilangan posisi di galeri |
| Minta perbaikan per item | Catatan di dalam kartu bukti; jumlah catatan muncul di tombol "Kirim perbaikan (2)" di atas | Edit di tempat; satu kirim untuk semua |
| Banding run | Halaman sendiri (butuh lebar dua kolom) | Pohon keputusan: butuh lebar = halaman |
| Hapus run dari Riwayat | Menu baris -> konfirmasi modal: "Hapus dari riwayat? Commit dan bukti di folder proyek tidak disentuh." | Tidak bisa dibatalkan |

### 5a. Run baru secara rinci (permintaan pemilik)
Isi layar dari atas ke bawah. Bentuk visualnya milik ui-designer.
1. Judul "Run baru".
2. Chip perintah dari definisi tim. Perintah yang dipilih mengubah contoh isi kotak ketik:
   - Mulai dari ide: "Aplikasi absensi untuk 3 cabang…"
   - Lanjut backlog: kotak ketik boleh kosong, contohnya "Catatan tambahan (opsional)".
   - Prompt bebas: "Apa yang mau dikerjakan?"
3. Kotak ketik yang tumbuh dari 3 sampai 12 baris, lalu bisa digulir. **Enter** mengirim, **Shift+Enter** membuat baris baru, Enter selama komposisi IME tidak mengirim, dan batas panjangnya 20.000 karakter. Teks yang belum dikirim disimpan sebagai draf per perangkat.
4. Baris tombol di bawah kotak ketik:
   - **Folder** (nama folder + path relatif): sebelah kiri.
   - **Tim** (mis. "Fullstack"): selalu tampil meski baru ada satu tim (F1).
   - **Model** ("Sonnet"): sebelah kanan, dekat tombol kirim.
   - **Mulai**: tombol kirim.
5. **Bawaan pintar:**
   - Folder: folder run terakhir; bila dibuka dari Layar proyek, folder proyek itu; bila belum pernah ada run, folder kerja.
   - Model: model terakhir; bila belum ada, `defaultModel` dari server.
   - Tim: tim terakhir.
   - Perintah: yang terakhir dipakai di folder itu; bila folder punya backlog yang belum habis, "Lanjut backlog"; bila tidak, "Mulai dari ide".

**Popover folder** (sumber data: `GET /api/folders`, akar = `workRoot`):
- Kotak "Cari folder" di atas, yang menyaring daftar di bawahnya menurut nama.
- Bagian **Terakhir dipakai**: maksimal 5 folder, dari run terbaru. Satu klik langsung memilih.
- Bagian **Jelajah**:
  - Jejak path dimulai dari folder kerja, mis. "01_Workspace › clients". Tiap bagian jejak bisa diklik, dan tidak ada jalan naik di atas folder kerja.
  - Di bawah jejak ada daftar subfolder. Klik baris = masuk ke folder itu. Tombol **Pilih** yang selalu tampil di tiap baris = langsung memakai folder itu.
  - Di bawah daftar: tombol "Pakai <nama folder ini>" untuk folder yang sedang dibuka, dan "Folder baru di sini". Folder baru dibuat lewat kotak nama + Enter, lalu git init (A11) dan langsung terpilih.
- Keyboard: panah atas/bawah memindah sorotan, panah kanan masuk ke folder, panah kiri naik satu tingkat, Enter memilih folder yang disorot, Esc menutup.
- Folder yang punya run aktif diberi label "sedang jalan".

**Saat Mulai:**
- Berhasil: langsung pindah ke Layar proyek, prompt tampil sebagai pesan pertama di Chat (F2: run Jalan dalam 5 detik).
- Proyek sibuk (409 `project_busy`): teks dan isian tetap. Muncul baris di bawah kotak ketik "Proyek ini sudah punya run aktif." [Buka run].
- Kapasitas penuh (409 `capacity`): "Sudah <n> run jalan bersamaan. Hentikan satu atau tunggu." [Lihat proyek].
- Folder sudah tidak ada (400): baris galat menempel di tombol folder, dan popover folder terbuka di folder induk terdekat.
- Bila folder = folder kerja, tampil satu baris tetap di bawah kotak ketik: "Agent bisa mengubah semua isi 01_Workspace tanpa bertanya." (persetujuan no. 2).
- Tombol Mulai tidak pernah dinonaktifkan tanpa alasan. Bila kotak kosong pada perintah yang butuh isi, tekan Mulai menampilkan "Tulis dulu apa yang mau dikerjakan."

**Model** berlaku untuk sesi utama (orkestrator). Agent tim tetap memakai model yang dideklarasikan di definisi tim. Detail agent menampilkan perbandingan model "terdeklarasi vs terpakai" (F4).

### 5b. Chat secara rinci (perilaku ala aplikasi Claude)
- **Urutan isi Chat:**
  - Prompt pemilik ada di posisi pertama.
  - Pesan agent, kartu pertanyaan, kartu izin, dan pesan Anda tampil berurutan waktu.
  - Pesan sistem (batch selesai, limit, gagal, run selesai) tampil di tengah, kecil, tanpa gelembung.
  - Pesan Anda di kanan; pesan agent di kiri dengan nama pengirim (orkestrator).
- **Langkah alat** (event `tool`) di antara dua pesan agent digabung jadi satu baris yang bisa dibuka: "8 langkah · Write, Bash, Read". Isinya daftar langkah beserta ringkasannya; langkah dari subagent diberi label nama agentnya. Ref 14 Tool-use transparency.
- **Teks agent** dirender sebagai markdown aman: paragraf, daftar, tebal, kode (blok kode dengan tombol Salin), dan tautan yang ditampilkan sebagai teks + tombol salin. HTML mentah selalu ditampilkan sebagai teks biasa (PRD F5 edge case, KEPUTUSAN "teks agent").
- **Kotak ketik** selalu ada di bawah Chat, dengan perilaku sama seperti Run baru (Enter / Shift+Enter, tumbuh, draf disimpan per run).
  - Saat run Jalan, pesan dikirim langsung. Baris kecil di atas kotak: "Pesan masuk setelah langkah yang sedang jalan selesai."
  - Saat Dijeda, pesan ditandai "menunggu Lanjut", lalu "terkirim saat lanjut".
  - Saat Selesai (run terakhir proyek), mengetik melanjutkan sesi yang sama (persetujuan no. 3).
  - Sesi dari desktop: kotak ketik diganti teks "Sesi dari aplikasi desktop tidak bisa dikirimi pesan dari sini."
- **Gulir otomatis** ke bawah hanya bila Anda sedang di dekat bawah. Bila Anda sedang membaca ke atas, muncul penanda "Pesan baru ↓".
- **Yang menunggu Anda tidak pernah tersembunyi.** Bila kartu pertanyaan/izin yang belum dijawab berada di luar layar, di atas kotak ketik tampil penanda "2 menunggu kamu ↓". Klik penanda melompat ke yang tertua. Membuka Layar proyek dari notifikasi atau dari "Butuh kamu" langsung menggulir ke kartu tertua yang belum dijawab.
- **Kartu yang sudah dijawab** menciut jadi satu baris berisi pertanyaan + jawaban + sumber jawaban:
  - "Warna apa untuk file warna.txt? → Biru · kamu, 14.02"
  - "Izin Write D:\luar-tes.txt · Ditolak: jangan menulis di luar proyek"
  - Bila dijawab dari aplikasi desktop: "Dijawab dari desktop"
  - Bila dijawab di perangkat lain bersamaan (409 `already_answered`): "Sudah dijawab dari perangkat lain"
  - Bila run berakhir sebelum dijawab: "Dibatalkan: run berakhir"
- **Kartu izin** menampilkan path atau perintah apa adanya dalam huruf monospasi, ditambah alasan ditanya (`tool.why`, mis. "Path di luar folder proyek"). Tombol Setujui tidak dipicu oleh Enter dari kotak ketik, supaya izin tidak tersetujui karena salah ketik.

## 6. Dashboard

### 6.1 Daftar proyek (`/`)
- **Pertanyaan:** proyek mana yang butuh saya sekarang?
- **Angka** (semua dari Run.status, Run.pending, Message, Milestone di PRD):
  1. Butuh kamu: jumlah pertanyaan + izin + usulan milestone yang belum dijawab, dari semua proyek (Σ `pending`).
  2. Siap review: jumlah milestone berstatus siap review.
  3. Jalan: jumlah run aktif / batas (`maxRuns`), mis. "1/1".
  4. Gagal atau terputus: jumlah run yang terakhir berstatus gagal/terputus dan belum dilanjutkan.
  5. Jeda limit: jumlah run, dengan jam reset paling awal.
- **Aturan masalah:**
  - `pending > 0` pada proyek mana pun.
  - Milestone siap review (berapa pun lamanya).
  - Run terakhir proyek berstatus gagal atau terputus.
  - Jeda limit adalah info, bukan masalah: tampil dengan jam reset, tanpa warna masalah.
- **Aksi**, satu klik dari baris proyeknya:
  - Butuh kamu -> Layar proyek, Chat tergulir ke kartu tertua.
  - Siap review -> Review milestone.
  - Gagal/terputus -> Lanjutkan (sesi baru di run yang sama, F2), di samping tautan "Lihat alasan".
  - Jeda limit -> tanpa aksi, cukup jam reset.
- **Urutan informasi:**
  1. Ringkasan: 5 angka di atas, dan angka bernilai 0 diciutkan.
  2. Yang perlu diurus: proyek dengan butuh kamu, diurutkan dari pertanyaan tertua; lalu siap review; lalu gagal/terputus.
  3. Tampilan utama: proyek yang sedang jalan, dengan milestone "UI · 7/24 item", agent aktif saat ini, dan durasi.
  4. Rincian: proyek diam, diurutkan menurut aktivitas terakhir.
  5. Tiap baris proyek: nama folder + path relatif dari folder kerja, status (teks + ikon), jumlah butuh kamu, waktu aktivitas terakhir, label "dari desktop" untuk sesi desktop (F10).
- Tombol **Run baru** di kepala halaman.
- Baris pemberitahuan "Aktifkan pemberitahuan" muncul sekali di kepala halaman bila izin pemberitahuan belum diberikan. Baris ini bisa ditutup dan tidak muncul lagi setelah ditutup.
- **Polling** tiap 3 detik (KEPUTUSAN: tidak ada aliran global).

### 6.2 Layar proyek (bagian dashboard)
- **Pertanyaan:** apa yang sedang dikerjakan, dan apakah ada yang menunggu saya?
- **Angka di bar atas** (PRD F4):
  - Status run.
  - Milestone aktif + progres item ("UI · 7/24 item").
  - Batch ke berapa ("batch 2").
  - Token (definisi di bagian 11).
  - Durasi.
  - Jumlah menunggu kamu.
  - Kendali: Jeda/Lanjut dan Stop.
- **Aturan masalah:**
  - Pertanyaan/izin belum dijawab -> agent itu berstatus "Butuh kamu" di kolom kiri dan di node grafik, dan tab Chat diberi lencana bila tab Detail sedang terbuka.
  - Item gagal 2 kali -> run berhenti; pesan di Chat menyebut item, agent, dan alasan.
  - Commit gagal -> run dijeda; alasan tampil di Chat.
  - Run gagal/terputus -> bar atas menampilkan alasan + Lanjutkan.
- **Aksi:**
  - Jawab, Setujui, dan Tolak ada di kartu Chat.
  - Lanjutkan ada di bar atas dan di pesan sistem gagal.
  - Klik agent -> Detail agent.
- **Urutan informasi:**
  1. Bar atas.
  2. Kolom kiri: agent, urut Butuh kamu, lalu Gagal, lalu Jalan, lalu sisanya menurut urutan alur tim. Tiap agent menampilkan status teks + ikon dan jumlah putaran bila lebih dari 1.
  3. Grafik (atau timeline), dengan pilihan tampilan diingat per perangkat.
  4. Chat sebagai kolom kanan bawaan.
  5. Detail agent sebagai rincian berdasarkan permintaan.
  6. Riwayat batch (item, commit, token, durasi; F3) di dalam pesan sistem batch selesai yang bisa dibuka, dan di Detail.
- **Isi Detail agent** (F4): tugas, model terdeklarasi vs terpakai, skill, alat/MCP, langkah kerja, file berubah, token, durasi, bukti item. Agent yang belum jalan menampilkan definisinya.
- **Sesi dari desktop** (F10): label "dari desktop" di bar atas. Kendali yang ada hanya Stop. Jeda tidak tampil karena tidak ada di PRD F10.

### 6.3 Kesehatan kit (`/kesehatan`)
- **Pertanyaan:** di mana kit boros atau membuat saya menunggu, dan apakah membaik dibanding periode sebelumnya?
- **Saringan:** proyek (semua), tim (Fullstack), rentang tanggal (bawaan 30 hari terakhir). Pembanding = periode sebelumnya yang sama panjang. Saringan disimpan di URL.
- **Angka** (masing-masing dengan pembanding periode sebelumnya):

| # | Angka | Dari data PRD |
|---|---|---|
| 1 | Token per item selesai (median) | AgentActivity.token / Item berstatus selesai |
| 2 | Token per milestone (rata-rata, per jenis milestone) | Milestone.token |
| 3 | Waktu menunggu kamu (total, dan median per pertanyaan) | Message: waktu dijawab - waktu masuk, jenis pertanyaan/izin |
| 4 | Revisi berulang: % item yang punya item perbaikan atau retry | Item.asal = perbaikan, Item.retry |
| 5 | Backlog melar: % item yang ditambah setelah milestone mulai | Item.asal = ditambah / item awal milestone |
| 6 | Agent paling boros: nama + bagian token | AgentActivity.token per agent |

- **Aturan masalah** (ambangnya asumsi, lihat bagian 11):
  - Token per item > 1,5x median periode sebelumnya, pada basis >= 5 item.
  - Median waktu menunggu kamu > 30 menit.
  - Revisi berulang > 20% item.
  - Backlog melar > 25% dari item awal milestone. Sebagai acuan, TOconnect 147 -> 258 = 75%.
  - Satu agent > 40% token rentang itu.
  - Basis < 5 tidak pernah ditandai dan tidak ditampilkan sebagai persen (`dashboard-design`: tiny data).
- **Aksi:**
  - Tiap angka dan tiap masalah bisa diklik ke daftar asalnya (F9):
    - token per item -> 10 item termahal (item -> run asal)
    - menunggu -> pertanyaan terlama (-> pesan di Chat run itu)
    - revisi -> item asal dengan jumlah perbaikan/retry
    - melar -> milestone dengan item tambahannya
    - agent -> Detail agent di run-run termahal
  - Tindakan perbaikan kit sendiri berada di luar dashboard (mengubah agent/skill). Aksinya di sini adalah membuka bukti asalnya.
- **Urutan informasi:**
  1. Saringan.
  2. 6 angka + pembanding.
  3. Yang perlu diurus: daftar masalah yang memenuhi aturan, tiap baris dengan tautannya.
  4. Tampilan utama: token per milestone dari waktu ke waktu, dengan milestone sejenis bisa dibandingkan.
  5. Rincian: token per agent (peringkat), menunggu per proyek, revisi per agent.
  6. Tabel lengkap item (judul, proyek, milestone, agent, token, retry, asal), bisa diurut dan disaring, 50 per halaman.
- Angka tanpa data: "belum ada data", bukan 0 (F9). Angka dari data yang belum lengkap (mis. token sebelum batch tercatat per item) diberi label "sebagian".

## 7. Pemasaran
Tidak ada. Crew Control adalah alat pribadi tanpa halaman publik (PRD Non-goals). `.agents/product-marketing.md` tidak dibuat.

## 8. Alur utama
**T1 Mulai run (folder sama).**
1. Run baru (rel kiri, tab bawah HP, atau tombol di Daftar proyek).
2. Ketik.
3. Enter.

Hasil: Layar proyek, status Jalan.
- Gagal: proyek sibuk -> baris + [Buka run]; kapasitas -> baris + [Lihat proyek]; folder hilang -> galat di tombol folder; server tak terjangkau -> "Server tidak terjangkau. Cek apakah server masih jalan.", teks tetap di kotak.

**T1b Folder lebih dalam.**
1. Run baru.
2. Tombol folder.
3. Klik baris "clients" (masuk).
4. Pilih di baris "toconnect".
5. Ketik.
6. Enter.

**T1c Folder yang pernah dipakai.**
1. Run baru.
2. Tombol folder.
3. Klik di Terakhir dipakai.
4. Ketik.
5. Enter.

**T2 Lanjut backlog sampai milestone.**
1. Run baru.
2. Chip Lanjut backlog (0 bila sudah jadi bawaan).
3. Enter.
4. Kartu usulan milestone -> Setujui.
5. Batch berjalan dan commit otomatis tanpa pemberitahuan.
6. Notifikasi Siap review -> T5.
- Gagal:
  - item gagal 2x -> run berhenti, pesan Chat (item, agent, alasan) + pemberitahuan.
  - commit gagal -> run dijeda + alasan.
  - limit -> status Jeda limit + jam reset; run lanjut sendiri.
  - backlog habis sebelum milestone -> pesan sistem "Backlog habis" dan status Selesai.

**T3 Jawab pertanyaan.**
1. Notifikasi (HP: push; laptop: judul tab "(1) Butuh kamu · <proyek>", bunyi, notifikasi desktop).
2. Layar proyek terbuka di Chat, tergulir ke kartu.
3. Ketuk pilihan -> terkirim. Kartu menciut, agent lanjut.
- Multi-pertanyaan: pilih per pertanyaan -> Kirim jawaban. Bila ada yang belum dijawab, Kirim menandai kelompok yang kosong dengan teks "Pilih salah satu atau ketik jawaban".
- Gagal: sudah dijawab di tempat lain -> kartu menciut "Sudah dijawab dari perangkat lain"; galat kirim -> kartu tetap terbuka + pesan galat di kartu itu.
- HP di luar Tailscale: notifikasi tetap datang, tetapi membukanya gagal. Halaman offline aplikasi web menampilkan: "Crew Control hanya bisa dibuka lewat Tailscale. Nyalakan Tailscale lalu coba lagi."

**T4 Izin.**
1. Notifikasi.
2. Setujui.
- Tolak: Tolak -> kotak alasan (fokus) -> ketik (opsional) -> Enter.
- Selalu setujui: satu klik -> pesan sistem "Aturan disimpan" [Batalkan].

**T5 Review milestone.**
1. Notifikasi Siap review (atau baris di Daftar proyek).
2. Halaman Review: ringkasan + galeri.
3. Setujui -> milestone Disetujui, milestone berikutnya mulai otomatis. Kembali ke Layar proyek, dengan pesan sistem di Chat.
- **Minta perbaikan:** di kartu item, Minta perbaikan -> ketik catatan -> (ulang per item) -> Kirim perbaikan (n).
  - Hasilnya, catatan menjadi item perbaikan dan run lanjut.
  - Saat milestone kembali Siap review, item perbaikan diurutkan di depan dan ditandai "perbaikan".
- **Setujui saat ada catatan yang belum dikirim:** konfirmasi "2 catatan belum dikirim. Setujui tanpa perbaikan?" [Setujui] [Kirim perbaikan].
- **Bukti hilang:** kartu menampilkan "Berkas tidak ditemukan: <path>".
- **Bukti besar** (> 5 MB atau video): pratinjau + "Buka berkas asli".

**T6 Kesehatan kit.**
1. Kesehatan kit.
2. Klik angka atau baris masalah -> daftar asal.
3. Klik item -> run asal (Riwayat, baca saja).

**T7 Riwayat dan banding.**
1. Riwayat.
2. Centang run A.
3. Centang run B.
4. Banding.

Hasil: angka berdampingan (token 4 jenis, durasi, item, token per item, menunggu kamu, jumlah batch) dan selisih.
- Beda tim atau perintah -> peringatan di atas: "Tidak setara: tim atau perintah berbeda."
- Centang lebih dari 2 -> Banding menjelaskan "Pilih tepat 2 run."

Buka run lama: Riwayat -> klik baris -> run baca saja, berisi Chat, galeri bukti, dan riwayat batch.

**T8 Stop.**
1. Stop.
2. Hentikan.

Hasil: status Dihentikan dalam 10 detik dan pesan sistem "Run dihentikan. Pekerjaan yang belum di-commit tetap di folder."

**Lanjutkan run gagal/terputus:** klik Lanjutkan di bar atas atau Daftar proyek -> sesi baru di run yang sama, dan Chat mendapat pesan sistem "Dilanjutkan di sesi baru".

**HP.** Tab Proyek -> ketuk proyek -> Chat penuh layar. Isinya:
- Kepala: nama proyek, status, milestone, Jeda, Stop.
- Baris "Agent: 2 jalan · 1 butuh kamu" yang bisa dibuka menjadi daftar status agent singkat. Ini pengganti kolom kiri dan grafik (F11).
- Review di HP: kartu bertumpuk satu kolom; Setujui dan Kirim perbaikan menempel di bawah layar.

## 9. State per layar
| Layar | Kosong | Memuat | Galat | Sukses / lain |
|---|---|---|---|---|
| Daftar proyek | Belum ada run: "Belum ada run." + [Run baru]; tanpa ringkasan angka nol | Kerangka baris; data lama tetap tampil saat polling | Polling gagal: satu baris di kepala "Tidak bisa memuat ulang. Ini data terakhir pukul 14.02." Data lama tetap tampil | Semua diam: tanpa bagian "Yang perlu diurus" (tidak menulis "semua aman") |
| Run baru | Folder kerja tanpa subfolder: "Belum ada folder di sini." + [Folder baru di sini] | Popover folder: kerangka daftar setelah 300 ms | Lihat T1 gagal; daftar folder gagal: "Folder tidak bisa dibaca." + [Coba lagi] | Pindah ke Layar proyek |
| Layar proyek | Belum ada run: grafik tim diam + satu ajakan [Mulai run] (F4); Chat kosong | Koneksi live: "Menyambung…" kecil di bar atas; data diputar ulang dari SSE | SSE putus: "Koneksi terputus, menyambung ulang…" di bar atas, kendali tetap bisa dipakai; run tidak dikenal: "Run tidak ditemukan." + [Ke daftar proyek] | Gagal: alasan + log terakhir (dilipat) + [Lanjutkan]; Terputus: "Server berhenti saat run jalan." + [Lanjutkan]; Jeda limit: "Lanjut sendiri pukul 17.00"; Dijeda: label "Dijeda" + [Lanjut]; Selesai: kotak ketik tetap aktif |
| Detail agent | Agent belum jalan: definisinya saja | Kerangka | "Detail tidak bisa dimuat." + [Coba lagi] | Agent di luar tim: label "di luar tim" (F1) |
| Review milestone | Tidak ada milestone siap review: "Belum ada milestone untuk direview." + tautan ke proyek | Kerangka kartu sebesar kartu akhir | Galat muat: satu catatan di atas + [Coba lagi]; bukti hilang/besar: lihat T5 | Disetujui: kembali ke Layar proyek; dibuka lagi setelah disetujui: baca saja + label "Disetujui <tanggal>" |
| Kesehatan kit | Belum ada data: struktur tetap, tiap angka "belum ada data", satu baris "Angka muncul setelah run pertama selesai." | Angka lama diredupkan saat saringan berubah, tanpa kilasan nol | Satu catatan di halaman, bukan per angka | Data sedikit: basis < 5 ditulis "dari 3 item" tanpa persen dan tanpa tanda masalah |
| Riwayat | Belum ada run: "Belum ada run." + [Run baru]; saringan kosong: "Tidak ada run yang cocok." + [Hapus saringan] | Kerangka baris | Satu baris + [Coba lagi] | Hapus: baris hilang, toast "Run dihapus dari riwayat" 5 dtk |
| HP | Sama dengan layar asal | Sama | Di luar Tailscale: halaman offline (T3) | Izin pemberitahuan ditolak: "Pemberitahuan mati. Judul tab dan bunyi tetap jalan." + cara mengaktifkan |
| Semua | Tanpa izin: tidak ada (tanpa akun; akses di luar localhost/Tailscale ditolak server, pengguna tidak melihat aplikasi) | | Server mati: satu bilah tetap "Server Crew Control tidak terjangkau." | Tema mengikuti sistem pada kunjungan pertama, lalu diingat |

Status run selalu teks + ikon, tidak hanya warna (F4). "Selesai" tidak pernah berlabel "Jalan" (F12).

## 10. Istilah
| Istilah | Arti | Jangan dipakai |
|---|---|---|
| Run | satu kali kerja tim di satu folder, dari Mulai sampai berhenti | sesi (sesi = proses Claude Code di dalam run), job |
| Proyek | folder tempat run dimulai, di bawah folder kerja | repo, workspace |
| Folder kerja | akar yang diizinkan (`D:\01_Workspace`) | root, workspace |
| Butuh kamu | ada pertanyaan, izin, atau usulan yang menunggu | pending, perlu aksi |
| Pertanyaan / Izin | dua jenis kartu di Chat | prompt, approval |
| Setujui · Tolak · Selalu setujui | tiga jawaban izin | Allow, Izinkan |
| Milestone · Batch | kumpulan item yang direview · 5 item per sesi | sprint, fase |
| Bukti | hasil yang bisa dilihat per item | artefak, evidence |
| Siap review · Jeda limit · Terputus | status run (label `STATUS_LABEL`) | ready, rate limited |
| Jeda · Lanjut · Stop · Lanjutkan | kendali; Lanjutkan = sesi baru setelah gagal/terputus | Pause, Resume |

Nada mengikuti `ux-writing-id`:
- Sapaan "kamu".
- Judul 1-6 kata, tombol 1-3 kata, kalimat maksimal 20 kata.
- Tanpa tanda seru di layar kendali.
- Waktu memakai `Intl` id-ID ("14.02", "4 Nov").
- Token ditulis ringkas ("78,4 rb"), angka persisnya di keterangan.

## 11. Asumsi dan pertanyaan terbuka
**Asumsi (diputuskan agent, bisa diubah):**
- U1. **Ambang masalah Kesehatan kit:** 1,5x token per item, 30 menit menunggu, 20% revisi, 25% melar, 40% token satu agent. Ambang ini disetel ulang setelah 3 milestone nyata.
- U2. **Definisi "token"** di semua layar = input + output + cache tulis. Cache baca ditampilkan terpisah di keterangan, karena di data asli cache baca 50.622 sedangkan output 2.286, sehingga menjumlahkan semuanya akan mengaburkan perbandingan. Satu definisi dipakai di semua layar. **Architect** memastikan definisi mana yang paling dekat dengan batas pemakaian langganan; bila berbeda, definisi diganti di satu tempat.
- U3. **Yang diingat:** folder, model, tim, dan perintah terakhir disimpan per perangkat (entitas Pengaturan), sedangkan perintah terakhir per folder disimpan di server.
- U4. **Layar proyek** menampilkan run aktif proyek itu, atau run terakhirnya bila tidak ada yang aktif. Run lebih lama hanya lewat Riwayat.
- U5. **"Selalu setujui"** disimpan per proyek. Mengelola daftar aturan (lihat/hapus) belum ada di PRD, jadi yang tersedia hanya Batalkan di pesan sistem. Bila perlu daftar aturan, itu tambahan PRD.
- U6. **Bunyi** hanya untuk pemicu PRD F6, dengan bunyi yang sama untuk semua jenis pemicu.
- U7. **Banding** Riwayat hanya untuk 2 run (PRD F12).
- U8. **Model terpilih** hanya berlaku untuk sesi utama. Agent tim tetap memakai model dari definisi tim.

**Pertanyaan terbuka:**
- Persetujuan pemilik no. 1-3 di bagian 1.
- Untuk architect: data token per item dan per agent membutuhkan pencatatan AgentActivity per batch. Irisan tipis baru menyimpan token per run (`Run.tokens`).
- Untuk architect: endpoint folder baru (A11) dan "terakhir dipakai" (daftar proyek dari run) belum ada di API.
- Untuk ui-designer: bentuk visual semua layar, termasuk grafik ala n8n, timeline, dan galeri. Dokumen ini hanya menetapkan isi, urutan, dan perilaku.
