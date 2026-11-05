# UX: Flow Viewer v2
Sumber: docs/PRD.md (Locked v1.2) · Bahasa UI: id · Tahap: ux (pembaruan v1.2: F4, F11, F12, Riwayat, Live) · Tanggal: 2026-11-03
Pembanding "langkah awal" = v1.0 dokumen ini: viewer 1.7.1; v1.2: tampilan yang sedang berjalan (`server/public`, build 08ed9716dc6e), diaudit di Lampiran A.
Nomor bagian berubah dari v1.0 (rujukan lama di TASKS/backlog tetap bisa dicari): §4 lama -> §5, §5 lama -> §8, §6 lama -> §9, §7 lama -> §10, §8 lama -> §11.

## 1. Ringkasan untuk pemilik

- **Audit layar yang berjalan:** 7 blocker (Lampiran A). Terpenting: Backlog menandai 4 keputusan yang sudah kamu jawab sebagai "perlu keputusan"; detail agent gagal tidak menyebut alasan gagalnya; pertanyaan Claude tidak terbaca tanpa klik; tombol Laporan muncul di tiap baris Riwayat dan menutupi tombol Buka.
- **Backlog:** dikelompokkan per bagian produk (Live, Riwayat, Pemberitahuan, ...), baris teratas menjawab "<n> bagian macet · <m> keputusan menunggu kamu · Berikutnya: <item>". Cari yang macet: 1 klik (sekarang: tidak terjawab).
- **Detail agent:** atas = status, satu kalimat jawaban (hasil, alasan gagal, atau pertanyaan), tiga angka, lalu peringatan. Rincian di bawah dalam urutan tetap. Lima tab diganti satu kolom. Cek file agent: 3 langkah -> 2; agent gagal, tahu sebabnya: 3+ -> 1.
- **Riwayat dan Laporan token:** tiap run langsung menunjukkan selisih token terhadap run pembandingnya dan tanda Boros, jadi kamu tidak perlu mencentang dua run. Ada satu tombol "Laporan token" untuk satu proyek. Bagian teratas laporan menyebut 3 penyumbang token terbesar. Telusuri run boros: 4+ langkah -> 2.
- **Live:** sel terlebar di pita = siapa kerja / butuh kamu, bukan rincian token per agent. Kotak pertanyaan kembali di bawah pita.
- **Perlu persetujuan (ya/tidak):**
  1. Riwayat menjadi tampilan selebar layar (pita tetap terlihat), bukan panel kanan sempit seperti build sekarang. Rekomendasi: **ya** (barisnya butuh 6 kolom; di panel, tombol saling menimpa).
  2. Detail agent menjadi satu kolom (jawaban di atas, rincian berurutan), tanpa lima tab. Rekomendasi: **ya** (peringatan tidak bisa tersembunyi di tab lain).
  3. Persen di Laporan token dihitung dari token setara (sama dengan pita dan Riwayat), bukan token mentah. Rekomendasi: **ya** (sekarang satu agent bisa 69% di laporan tapi 64% di angka lain).
- **Usulan perubahan PRD:** tidak ada.

## 2. Tugas dan langkah

Langkah = aksi pengguna (klik, pindah tab/jendela, centang, gulir untuk mencari). Membaca tidak dihitung. Rincian hitungan di bagian 8.

| Tugas | Langkah awal | Langkah rancangan | Apa yang dihapus |
|---|---|---|---|
| T1. Membuka proyek yang sedang jalan | 1.7.1: 1, data dua proyek tercampur | 2; 1 bila satu proyek aktif | Status global tunggal; daftar sebagai layar pembatas saat hanya ada satu proyek |
| T2. Cek sekilas: siapa kerja, sampai mana, token + selisih | 1.7.1: 4-6 | 0, dari layar mana pun | Banding token manual; status tersebar |
| T3. Tahu ada pertanyaan/izin/keputusan, membacanya, pindah ke Claude | 1.7.1: 3-4. Build: 3 (klik penanda "butuh jawabanmu", gulir Chat, pindah) | 2 (klik notifikasi/tab, pindah ke Claude); di viewer 1 | Mencari pertanyaan di percakapan; kotak pemberitahuan di bawah pita dikembalikan |
| T4. Memeriksa satu agent lalu file-nya; lalu agent berikutnya | 1.7.1: 3, lalu 2. Build: 3, lalu 2 (tab kembali ke Ringkasan) | **2**, lalu 1 | Tab File terpisah: bagian "File berubah" terbuka di kolom detail |
| T5. Menilai hasil run | 1.7.1: 6 | 1 | Pengumpulan manual dari empat tempat |
| T6. Membandingkan run dengan run sebelumnya | Build: 3 (Riwayat, centang 2 run) | **1** (Riwayat; selisih sudah di baris); dua run bebas: 3 | Centang untuk kasus paling umum (banding dengan pembanding) |
| T7. Backlog: bagian mana macet / menunggu saya, apa berikutnya (F11) | Build: 1 + gulir 77 item (2-4), bagian tidak bisa diketahui | **1** (buka Backlog atau klik sel Progres) | Daftar datar per jenis teknis; cari manual item keputusan |
| T8. Telusuri run boros sampai penyumbang terbesar (F8, F12) | Build: 4+ (Riwayat, centang 2, Laporan, gulir paragraf definisi dan tiga tabel) | **2** (Riwayat, Laporan token) | Tanda Boros manual; paragraf definisi di atas laporan |
| T9. Tahu kenapa agent gagal/diam (F4) | Build: 3+ (klik node, buka Aktivitas, cari baris merah; alasan gagal tidak ada di detail) | **1** (klik node atau "Lihat detail" di kotak pemberitahuan) | Alasan tersembunyi di tab Aktivitas |

## 3. Penggolongan layar

Kolom Jenis PRD dipakai tanpa koreksi.

| Layar | Jenis | Skill dan referensi yang dipakai |
|---|---|---|
| Daftar proyek | dashboard | dashboard-design; ux-designer 05, 18, 21 (tidak diubah di v1.2) |
| Live (pita, kotak pemberitahuan, grafik, panel) | dashboard | dashboard-design; ux-designer 05, 18, 21 |
| Detail agent | dashboard | dashboard-design; ux-designer 05, 18 |
| Backlog (panel) | dashboard | dashboard-design; ux-designer 05 (pengelompokan menurut struktur pengguna, bukan struktur organisasi), 21 |
| Riwayat | dashboard | dashboard-design; ux-designer 18, 21 |
| Laporan token | dashboard | dashboard-design; ux-designer 18, 21 |
| Ringkasan run | dashboard | tidak diubah di v1.2 |
| Skill, Log, Percakapan, File, Token (panel) | dashboard pendukung | tidak diubah di v1.2, kecuali lencana rel (§5) |
| Tugas di dalam layar (hapus run, analisis ulang, ganti tema) | aksi tunggal, bukan layar tugas | ux-designer pohon keputusan modal/panel |

## 4. Peta layar dan navigasi

```
/                         Daftar proyek
/?p=<proyek>              Tampilan proyek
   ├─ Live (default)      bilah atas + pita indikator + [kotak pemberitahuan] + grafik + panel samping
   │    ├─ panel samping: tab data proyek  Percakapan | Backlog | File | Skill | Token | Log
   │    ├─ panel samping: detail agent     satu kolom (kepala -> peringatan -> rincian)
   │    └─ lapisan Ringkasan run
   ├─ Riwayat             selebar layar: ringkasan angka, tren, daftar run, area banding
   │    └─ lapisan Laporan token (di atas Riwayat)
   └─ Run lama            tata letak Live, hanya baca, bilah "Kembali ke live"
```

| Keputusan | Alasan |
|---|---|
| Bilah atas: dua tampilan, **Live** dan **Riwayat** (tetap dari v1.0) | Dua tujuan berbeda; sisanya data pendukung |
| **Riwayat selebar layar**, bukan ikon rel/panel 400 px (build sekarang) | Baris perlu judul, waktu, flow, setara + selisih, durasi, aksi (6 kolom; ref 21: maks 7-10 kolom terlihat). Di panel, tombol Laporan menimpa Buka/Analisis (Lampiran A, R1) |
| Rel panel hanya memuat tab data proyek: Percakapan, Backlog, File, Skill, Token, Log (sesuai DESIGN §rel) | Ikon "Agent" di rel membuka panel kosong ("Klik sebuah agent"); detail dibuka dari node. "Riwayat" pindah ke bilah atas |
| Pita indikator dan kotak pemberitahuan menempel di atas di Live, Riwayat, Run lama | F3: tidak boleh tergulung; pemantauan tidak putus |
| Tidak ada sidebar navigasi kiri | Hanya 2 tampilan; lebar dipakai grafik 12 agent |

Lebar layar tetap seperti v1.0: 1200 px ke atas panel 400 px berdampingan; 900-1199 px panel tertutup secara bawaan dan mendorong grafik saat terbuka (340 px); di bawah 900 px grafik menjadi daftar kartu. Riwayat dan Laporan token di bawah 1200 px: kolom aksi baris berubah menjadi satu tombol menu baris.

## 5. Pola per tugas

| Tugas / bagian | Pola | Alasan |
|---|---|---|
| Daftar proyek | Halaman penuh, satu baris per proyek, baris = tautan | Ctrl+klik membuka tab baru (A1) |
| Pindah proyek | Menu tarik-turun di bilah atas | Konteks tetap terlihat |
| Tiga indikator (F3) | Pita menempel, tiga sel; sel Siapa kerja terlebar | Pertanyaan Live ("perlu pindah ke Claude?") dijawab di sel ini |
| Pemberitahuan (F5) | Kotak menetap di bawah pita + judul tab + bunyi + notifikasi desktop | Mendesak tapi tidak memblokir; viewer read-only |
| Detail agent (F4) | Panel samping, **satu kolom bergulir** dengan bagian berurutan tetap; bagian rincian bisa dilipat, status lipat diingat per browser untuk semua agent | Hierarki "jawaban di atas, rincian di bawah" (F4 AC); peringatan tidak bisa tersembunyi di tab lain; urutan sama untuk semua agent |
| Teks panjang di detail (hasil, tugas) | Cuplikan di tempat + "Tampilkan semua" (memperluas di tempat, bukan lapisan baru) | F4 AC 12 baris; konteks tidak hilang |
| Backlog (F11) | Tab panel; bagian = kelompok yang bisa dilipat; bagian Selesai dan grup Diparkir terlipat bawaan | Bagian bermasalah terlihat tanpa gulir; selesai tidak memakan tempat |
| Item menunggu dependensi | Nama item yang ditunggu = tautan; klik membuka bagiannya dan menyorot item itu | Pemilik bisa menelusuri penghambat tanpa mencari |
| Riwayat (F8) | Tampilan selebar layar di dalam tampilan proyek | Lihat §4 |
| Banding dua run | Area banding di atas daftar, muncul saat 2 run dicentang atau lewat aksi baris "Bandingkan" (mencentang run itu dan pembandingnya) | Kasus paling umum 1 klik; banding bebas tetap 2 centang |
| Laporan token (F12) | Lapisan besar di atas Riwayat (dialog), tutup lewat Esc, Tutup, klik di luar; fokus kembali ke tombol Laporan token | Isi lebar dan panjang; Riwayat tidak boleh kehilangan posisi gulir dan centang (F12 AC) |
| Hapus run | Tombol di menu baris -> "Yakin hapus run ini?" satu konfirmasi di tempat (A15) | Merusak tanpa undo, tetapi cukup satu konfirmasi; tidak perlu dialog |
| Analisis ulang | Aksi baris; label tombol berubah: "Menganalisis..." -> "Dianalisis: 4 dari 5 agent" / "Gagal, coba lagi" | Status hasil di tombol (F8 perilaku 5) |
| Reset run | Dua langkah di menu Lainnya (F9, tetap) | |
| Lencana rel | Hanya angka yang berarti tindakan: Percakapan = pertanyaan/izin terbuka (warn), Backlog = keputusan menunggu (warn), File = jumlah file, Skill = agent dengan skill belum terbukti. Tanpa angka total (77 item, 107 pesan) | Lencana total selalu menyala sehingga tidak pernah berarti masalah (dashboard-design: Quiet) |

## 6. Dashboard

Urutan informasi semua layar mengikuti Shneiderman (ref 18): ringkasan angka -> yang perlu diurus -> tampilan utama -> rincian -> tabel lengkap sebagai detail. Bentuk visual milik `ui-designer`.

### 6.1 Live (tampilan proyek)
- **Pertanyaan:** Apakah saya perlu pindah ke Claude sekarang, dan bila tidak, apakah kerja berjalan normal?
- **Angka:**
  1. Pemberitahuan terbuka, per jenis (Pertanyaan, Izin, Keputusan backlog, Gagal) - F5, Attention item.
  2. Agent berjalan: jumlah + nama + aktivitas terakhir (maks 2, "+N lainnya") - F3a, Agent.
  3. Agent diam: jumlah dan menit sejak event terakhir - 4a.
  4. Progres: persen + sumbernya ("Backlog 9 dari 77 item" / "Langkah wajib 3 dari 5" / "-") - F3b.
  5. Token setara + selisih terhadap pembanding, tanda Boros - F3c, 4a.
  6. Durasi run - Run.startedAt.
- **Aturan masalah:** pemberitahuan terbuka >= 1 · agent Gagal >= 1 · agent tanpa event > 10 mnt · setara > 150% pembanding · koneksi terputus.
- **Aksi:**
  | Masalah | Aksi di tempat masalah terlihat |
  |---|---|
  | Pertanyaan / Izin | Kotak pemberitahuan memuat teks lengkap + pilihan + "Jawab di aplikasi Claude."; tautan "Lihat percakapan" |
  | Keputusan backlog | Kotak: pertanyaan bisnis item; tautan "Lihat backlog" (membuka tab Backlog pada bagiannya) |
  | Gagal | Kotak dan node: alasan singkat; "Lihat detail" membuka detail agent |
  | Agent diam | Sel Siapa kerja dan node: "<agent> diam 12 mnt"; klik membuka detail agent |
  | Token boros | Sel Token: "Boros" (ikon + teks); klik membuka tab Token |
  | Terputus | Bilah terputus + jam pembaruan terakhir; menyambung ulang otomatis |
- **Urutan informasi:**
  1. Pita: (a) Siapa kerja, sel terlebar. Baris 1 menjawab pertanyaan: "Butuh input: jawab di Claude" / "1 agent gagal" / "2 agent berjalan" / "Tidak ada agent yang berjalan". Baris 2: nama + aktivitas, atau agent diam. (b) Progres + sumber + durasi kecil. (c) Token + selisih + Boros.
  2. Kotak pemberitahuan (hanya bila ada): pertanyaan, izin, keputusan, gagal; terbaru di atas.
  3. Grafik: node bermasalah ditandai di node (status, alasan satu baris, "Diam 12 mnt").
  4. Panel: detail agent atau tab data.
  5. Tabel token per agent (porsi per agent) hanya di tab Token, tidak di pita.
- Sesi utama tampil sebagai satu node "Claude" (istilah layar: Sesi utama, bukan "Orkestrator"). Isinya: model, skill dipanggil, tool dipakai. Tidak ada kartu kedua yang mengulang data yang sama. Statusnya "Berjalan" selama ada agent berjalan atau tool sesi utama berjalan; "Menunggu" hanya sebelum prompt pertama.

### 6.2 Detail agent (F4)
- **Pertanyaan:** Apa yang dikerjakan agent ini, apa hasilnya, dan apakah ada yang salah?
- **Angka (putaran terakhir, total semua putaran di sebelahnya bila putaran > 1):** durasi · token setara · jumlah putaran. Sumber: Agent usage/ms/count. Tanpa data token: "menunggu data", bukan 0 dan bukan "—" tanpa keterangan.
- **Aturan masalah (tampil sebagai peringatan di bawah kepala, satu baris per masalah, dengan penyebab):**
  | Masalah | Aturan | Teks peringatan (contoh) | Aksi |
  |---|---|---|---|
  | Gagal | status gagal | "Gagal: 2 tes merah (auth.test.js:41)" | "Lihat langkah yang gagal" -> menggulir ke baris galat di Langkah kerja |
  | Butuh input | attention item terbuka milik agent | "Butuh input: <pertanyaan>" + pilihan, "Jawab di aplikasi Claude." | - |
  | Diam | Berjalan, event terakhir > 10 mnt | "Diam 12 mnt sejak Bash npm test" | "Lihat langkah terakhir" |
  | Model beda | terbukti ≠ terdeklarasi | "Model beda: diminta opus, terpakai sonnet" | - (diubah di definisi agent, lewat Claude) |
  | Model belum terbukti | terdeklarasi ada, terbukti belum ada | "Model belum terbukti dari transkrip" | - |
  | Skill belum terbukti | skill terdeklarasi tidak terlihat dipanggil/termuat | "Skill belum terbukti: dashboard-design, cro" | "Lihat skill" -> bagian Skill |
- **Urutan informasi:**
  1. Kepala: nama agent, status (ikon + teks), peran satu baris (ringkasan pendek, bukan deskripsi frontmatter penuh), tombol tutup.
  2. Peringatan (hanya bila ada).
  3. Satu kalimat jawaban: Berjalan -> "Sedang: <aktivitas terakhir>"; Selesai -> baris pertama hasil; Gagal -> alasan; Butuh input -> pertanyaan; belum jalan -> "Belum jalan di run ini."
  4. Tiga angka.
  5. Rincian, urutan tetap, judul berbahasa biasa; bagian tanpa data = satu baris keterangan:
     1. **Hasil** (terbuka): cuplikan 12 baris + "Tampilkan semua". Kosong: "Belum ada hasil."
     2. **File berubah (n)** (terbuka): path, baru/diubah, +/- baris; klik membuka diff di tempat. Kosong: "Tidak ada file berubah."
     3. **Tugas yang diberikan** (terlipat): cuplikan 3 baris + "Tampilkan semua".
     4. **Langkah kerja (n)** (terlipat): tool call terbaru di atas, galat ditandai; klik membuka rincian (diff, perintah + output, prompt subagent).
     5. **Skill** (terlipat): dipanggil, termuat, belum terbukti.
     6. **Model dan izin** (terlipat): model terdeklarasi vs terbukti dengan sumber dan putusan (Sesuai, Beda, Belum terbukti), tingkat effort, tool yang diizinkan.
     7. **Pemakaian token** (terlipat): setara, mentah, konteks terakhir dari batas, giliran, porsi input/output/cache, lalu per pemanggilan, termahal dulu (isi tab "Pemanggilan" lama).
     8. **Definisi agent** (terlipat): peran lengkap, sumber file definisi.
  Status lipat diingat per browser dan berlaku untuk semua agent (T4: ganti agent, bagian yang sama tetap terbuka).
- Agent belum pernah jalan: kepala + "Belum jalan di run ini." + bagian Definisi, Model dan izin, Skill (terdeklarasi) terbuka; bagian lain disembunyikan, bukan kosong.
- Node Prompt: membuka tab Percakapan pada prompt itu (tetap).

### 6.3 Backlog (F11)
- **Pertanyaan:** Bagian mana yang macet atau menunggu saya, dan apa berikutnya?
- **Angka:** bagian macet (jumlah) · keputusan menunggu (item keputusan siap) · item siap berikutnya (judul) · persen keseluruhan (= F3b) · per bagian: selesai dari total. Sumber: `docs/backlog.json` (slice, status, type, needs, checkpoint). Diparkir dan ditolak tidak dihitung.
- **Aturan masalah (F11):**
  - Bagian **Butuh keputusan**: ada item keputusan berstatus siap (semua `needs` selesai, belum selesai). Item keputusan yang sudah selesai **tidak pernah** berlabel "perlu keputusan".
  - Bagian **Macet**: ada item gagal, atau ada item belum selesai tetapi tidak ada yang siap atau berjalan di bagian itu.
  - Item gagal.
- **Aksi:**
  | Masalah | Aksi |
  |---|---|
  | Keputusan menunggu | Item menampilkan pertanyaan bisnisnya + "Jawab di aplikasi Claude." |
  | Item gagal | Alasan gagal; bila agentnya ada di run ini: "Lihat detail agent" |
  | Bagian macet karena dependensi | Baris "Menunggu: <judul item>" (maks 2 judul, "+N"); judul = tautan ke item itu |
  | Berikutnya | Judul item siap teratas di baris jawaban = tautan ke item itu |
- **Urutan informasi:**
  1. Baris jawaban (satu baris): "<n> bagian macet · <m> keputusan menunggu kamu · Berikutnya: <judul>" (bagian nol tidak ditulis; tanpa item siap: "Tidak ada item siap").
  2. Persen keseluruhan + "<selesai> dari <total> item" (angka sama dengan sel Progres).
  3. Bagian, urut keadaan: Butuh keputusan, Macet, Berjalan, Belum mulai, Selesai (terlipat). Kepala bagian: nama biasa ("Detail node"), keadaan (ikon + teks), "<selesai> dari <total> item".
  4. Item di dalam bagian, urut: keputusan, gagal, berjalan, siap, menunggu dependensi, selesai. Baris item: judul, label jenis kecil (Tampilan, Penyambungan, Server, Uji, Keamanan, Review, Keputusan), keadaan teks, satu baris konteks (pertanyaan / alasan / "Menunggu: ..."). Nama agent, id item, dan bukti hanya saat baris dibuka.
  5. Bagian dengan lebih dari 20 item: item selesai dilipat menjadi "<n> item selesai".
  6. Grup "Diparkir" terlipat paling bawah (item ditolak ikut di grup ini dengan label "Ditolak").
- Backlog tanpa field irisan: dikelompokkan per jenis dengan label biasa; baris jawaban diawali "Backlog ini belum dibagi per bagian".

### 6.4 Riwayat (F8)
- **Pertanyaan:** Apakah run ini lebih boros atau lebih lama dari sebelumnya, dan di mana bedanya?
- **Angka:**
  1. Run terbaru: setara + selisih terhadap pembanding (4a).
  2. Run terbaru: durasi + selisih durasi terhadap pembanding yang sama (selisih netral, bukan merah/hijau).
  3. Jumlah run bertanda Boros di daftar.
  4. Run tersimpan: "<n> dari maks 200" untuk proyek ini.
  Sumber: Run (token setara, startedAt, updatedAt, flow).
- **Aturan masalah:** setara > 150% pembanding -> Boros · dua run dibandingkan beda flow -> peringatan tidak setara · run belum dianalisis per pemanggilan (info, bukan masalah).
- **Aksi:**
  | Masalah | Aksi |
  |---|---|
  | Run Boros | Di baris itu: "Bandingkan" (mencentang run itu + pembandingnya) |
  | Ingin tahu penyumbangnya | "Laporan token" di kepala Riwayat (satu per proyek; di mode semua proyek, satu per kepala grup) |
  | Run tidak berguna | Menu baris -> Hapus -> satu konfirmasi |
- **Urutan informasi:**
  1. Kepala: "Riwayat", pengalih "Hanya proyek ini" / "Semua proyek", tombol "Laporan token".
  2. Ringkasan angka 1-4.
  3. Area banding (saat 2 run dipilih): token setara, durasi, agent jalan, file berubah, masing-masing lama -> baru + selisih; peringatan flow berbeda di atasnya.
  4. Tren setara 12 run terakhir (tampilan utama; pembanding tiap titik terlihat).
  5. Daftar run, terbaru di atas, maks 60: judul atau prompt (bukan isi prompt mentah yang berisi tag; tanpa judul: "<flow> · <jam>"), waktu mulai ("20.02 · 2 jam lalu"), flow, setara + selisih + Boros, durasi, penanda "sedang berjalan". Aksi baris: "Buka" / "Lihat live" (utama), "Bandingkan", lalu menu baris: Ringkasan, Analisis ulang, Hapus. Run berjalan: Hapus tidak tersedia, teks "Run sedang berjalan".
  6. Mode semua proyek: grup per proyek, nama proyek di kepala grup + "Laporan token" grup itu.

### 6.5 Laporan token (F12)
- **Pertanyaan:** Agent, item, atau kebiasaan mana yang paling boros token di proyek ini?
- **Angka:** total setara proyek ("<n> run, <tanggal awal> - <tanggal akhir>") · tiga penyumbang setara terbesar (agent atau item) dengan persen dari total setara · setara per item selesai · jumlah run belum dianalisis. Sumber: Laporan token (per run, per agent, pemanggilan termahal). Semua persen dari setara (persetujuan 3); mentah tampil sebagai kolom kedua.
- **Aturan masalah:** tiga penyumbang terbesar selalu ditonjolkan (PRD) · run belum dianalisis > 0 -> catatan data belum lengkap · lebih dari 200 run -> catatan batas.
- **Aksi:** penyumbang agent -> tautan ke barisnya di Per agent; penyumbang item -> tautan ke barisnya di Pemanggilan termahal; run belum dianalisis -> "Jalankan Analisis ulang di baris run Riwayat" (menutup laporan dan menyorot baris pertama yang belum dianalisis). Keputusan (ubah model, pecah item) dibuat di Claude.
- **Urutan informasi:**
  1. Judul "Laporan token · <nama proyek>" (nama = folder proyek, sama dengan pengalih), jumlah run, rentang tanggal, "dibuat <jam>".
  2. Tiga penyumbang terbesar + total setara + setara per item.
  3. Catatan data (hanya bila ada): run belum dianalisis, batas 200 run, salinan file tidak tertulis.
  4. Per agent, urut setara: pemanggilan, giliran per pemanggilan, konteks puncak rata-rata, gambar, setara, % setara, model.
  5. Pemanggilan termahal (per item): item (tanpa item: "<agent> · pemanggilan <n>", bukan potongan prompt), agent, model, giliran, konteks awal -> puncak, setara.
  6. Kebiasaan sesi utama: cache ditulis ulang, laporan subagent (jumlah, rata-rata panjang), waktu kerja vs menunggu pemilik.
  7. Per run.
  8. Definisi (rumus setara, mentah, perkiraan output tool) paling bawah.
  9. Tombol: "Tutup" (utama).

### 6.6 Daftar proyek, Ringkasan run
Tidak diubah di v1.2 (lihat §5 dan §8 T1, T5).

## 7. Pemasaran

Tidak ada (alat lokal tanpa halaman publik).

## 8. Alur utama

### T1. Membuka proyek
1. Buka `localhost:4777` (1). 2. Satu proyek aktif: langsung `?p=<proyek>`. **1 langkah.** 3. Lebih dari satu: klik baris proyek (2). **2 langkah.** 4. Pindah proyek: pengalih (1), pilih (2).
- Gagal: tidak ada proyek aktif -> keadaan kosong daftar; `?p=` tidak dikenal -> "Proyek ini belum punya kejadian." + tautan Daftar proyek dan Riwayat; proyek tidak aktif -> run terakhir hanya baca, label "Tidak aktif sejak <waktu>".

### T2. Cek sekilas
1. Lirik pita. **0 langkah**, di Live, Riwayat, Run lama, saat detail/laporan/ringkasan terbuka (laporan dan ringkasan di bawah pita).
- Gagal: terputus -> bilah terputus + jam pembaruan; token belum terbaca -> "menunggu data"; tanpa flow dan backlog -> "-".

### T3. Tahu dan membaca pertanyaan, lalu menjawab di Claude
1. Pemicu: judul tab `(1) Butuh input · <proyek>`, bunyi, notifikasi desktop, node "Butuh input", item kotak pemberitahuan.
2. Klik notifikasi atau tab (1). Pertanyaan + pilihan sudah terbaca di kotak (0).
3. Pindah ke Claude, jawab (2). **2 langkah**; di viewer 1.
- Gagal: izin notifikasi ditolak -> judul + bunyi tetap, tombol "Notifikasi diblokir" + petunjuk. Proyek lain butuh input -> penanda di pengalih + notifikasi desktop sekali tanpa bunyi.
- Hitungan build: klik penanda "2 butuh jawabanmu" (1) -> tab Chat, gulir ke pertanyaan (2), pindah (3) = 3.

### T4. Memeriksa satu agent lalu file-nya; lalu agent berikutnya
1. Klik node (1). Detail: kepala, peringatan, jawaban, tiga angka; bagian Hasil dan File berubah terbuka.
2. Klik file di "File berubah" (2) -> diff di tempat. **2 langkah.**
3. Klik node lain (1): detail berganti, bagian yang terbuka tetap sama, daftar file agent itu langsung tampil. **1 langkah per agent berikutnya.**
4. Esc / tutup -> panel kembali ke tab data terakhir; posisi dan zoom grafik tetap.
- Run berlanjut: isi detail diperbarui di tempat; posisi gulir dan bagian yang terbuka dipertahankan.
- Gagal: detail gagal dimuat -> isi lama + "Detail gagal dimuat." + "Coba lagi". Agent belum jalan -> definisi. Panel diciutkan -> klik node membuka panel; menutup detail menciutkannya lagi.
- Hitungan build: klik node (1), tab File (2), file tidak bisa dibuka (daftar saja) = 2-3; agent berikutnya: node (1), tab File lagi karena tab kembali ke Ringkasan (2) = 2.

### T5. Menilai hasil run
1. Run Selesai/Gagal -> Ringkasan run terbuka sendiri (bila ada agent atau file berubah). 2. Tutup (1). **1 langkah.** Membuka lagi: tombol "Ringkasan" di sel Siapa kerja (1) atau Riwayat (1) + menu baris (2) + Ringkasan (3).
- Gagal: run berhenti karena error -> "Berhenti karena gagal di <agent>"; run Jeda -> tidak ada ringkasan dan tidak ada pemberitahuan Selesai.

### T6. Membandingkan run
1. Klik Riwayat (1). Baris run terbaru sudah menunjukkan "+12% dari pembanding" dan durasi. **1 langkah.**
2. Rincian: "Bandingkan" di baris itu (2) -> area banding dengan pembandingnya. **2 langkah.**
3. Dua run bebas: centang run A (2), centang run B (3). Run ketiga dicentang -> centang paling lama dilepas.
- Tanpa pembanding (run pertama flow itu, atau pembanding dihapus): baris menulis "tanpa pembanding", tidak ada Boros, "Bandingkan" tidak tersedia.
- Flow berbeda: "Flow berbeda (build vs ui-only). Perbandingan mungkin tidak setara."
- Buka run lama: "Buka" (2) -> tata letak Live hanya baca + bilah "Melihat run 27 Okt 14.02 · hanya baca" + "Kembali ke live". Run berjalan: "Lihat live". Label tombol: **"Buka"** (keputusan UX v1.2, pemilik menyerahkan ke UX): sama dengan PRD F8 perilaku 3; "Lihat" sudah dipakai untuk tautan ("Lihat live", "Lihat detail"), jadi run lama memakai kata kerja lain. Bila PRD kelak berbeda, PRD yang mengikuti label ini.
- **Uji regresi R1 (bug dari pemilik: "tombol Laporan per baris menimpa Buka (klik Buka malah buka laporan)"):** di Riwayat dengan minimal 2 run selesai, (a) tidak ada tombol Laporan di baris run; "Laporan token" hanya di kepala Riwayat (atau kepala grup di mode semua proyek); (b) klik "Buka" di baris run lama membuka tata letak Live hanya baca untuk run itu, dan lapisan Laporan token tidak terbuka; (c) tombol "Buka" utuh dan bisa diklik di lebar 1200 px dan di menu baris di bawah 1200 px (tidak tertutup elemen lain); (d) klik "Laporan token" di kepala membuka laporan proyek yang benar, bukan folder kerja server. Gagal bila salah satu tidak terpenuhi.
- Hapus: menu baris (2), Hapus (3), konfirmasi (4). Run berjalan: Hapus tidak ada, teks "Run sedang berjalan".

### T7. Backlog: bagian mana macet dan apa berikutnya
1. Klik tab Backlog di rel atau sel Progres (1). Baris jawaban terbaca; bagian bermasalah di atas, terbuka. **1 langkah.**
2. Opsional: klik nama item yang ditunggu (2) -> bagian itu terbuka, item disorot.
3. Bertindak (jawab keputusan, suruh lanjut) di Claude.
- Gagal: tanpa `docs/backlog.json` -> "Proyek ini belum punya backlog." tanpa angka. Berkas rusak / > 2 MB -> "Backlog tidak bisa dibaca: <alasan>"; panel lain tetap jalan. Tanpa irisan -> per jenis + "Backlog ini belum dibagi per bagian".
- Hitungan build: Backlog (1), gulir 77 item mencari "gagal"/"perlu keputusan" (2-4); bagian tidak tersedia, label "perlu keputusan" juga muncul di keputusan yang sudah selesai, jadi jawabannya keliru.

### T8. Telusuri run boros
1. Klik Riwayat (1). Baris run bertanda "Boros +64%" terlihat (0).
2. Klik "Laporan token" (2). Lapisan "Menyusun laporan..." lalu tiga penyumbang terbesar di atas. **2 langkah.**
3. Tutup (Esc / Tutup / klik di luar): posisi gulir dan centang Riwayat tetap.
- Gagal: laporan gagal -> "Laporan gagal disusun." + "Coba lagi" (tanpa teks galat server). Proyek tanpa run tersimpan -> tombol tidak tersedia + "Belum ada run untuk dilaporkan". Folder proyek tidak bisa ditulis -> laporan tetap tampil, salinan file dilewati, satu baris catatan di bagian Catatan data.
- Hitungan build: Riwayat (1), centang 2 run (2, 3), Laporan di baris (4), gulir melewati paragraf definisi dan tabel per run (5) = 5.

### T9. Tahu kenapa agent gagal atau diam
1. Klik node bertanda Gagal/Diam, atau "Lihat detail" di kotak pemberitahuan (1). Peringatan dengan penyebab di bawah kepala. **1 langkah.**
2. Opsional: "Lihat langkah yang gagal" (2) -> bagian Langkah kerja terbuka pada baris galat.
- Gagal: alasan tidak tersedia di event -> "Gagal tanpa alasan tercatat" + tautan ke Langkah kerja.
- Hitungan build: klik node (1); alasan gagal tidak ada di Ringkasan; tab Aktivitas (2), cari baris galat (3).

### Jangkauan data F9 (maks 2 klik dari Live)
| Data | Jalan | Klik |
|---|---|---|
| Siapa kerja, progres, token, durasi, putusan flow | Pita | 0 |
| Status, aktivitas, cuplikan, token, durasi, model, putaran per agent | Kartu node | 0 |
| Percakapan, Backlog, File, Skill, Token per agent, Log + linimasa | Tab rel | 1 |
| Kepala detail agent, hasil, file berubah | Klik node | 1 |
| Tugas, langkah kerja, skill, model dan izin, pemakaian token, definisi | Klik node, buka bagian | 2 |
| Diff satu file, isi satu pesan panjang | Tab / detail, klik baris | 2 |
| Riwayat | Bilah atas | 1 |
| Laporan token | Riwayat, Laporan token | 2 |
| Reset run, Laporan teks `/report` | Menu Lainnya | 2 (+1 konfirmasi reset) |

## 9. State per layar

| Layar | Kosong | Memuat | Galat | Sukses | Khusus / data sedikit / data lama |
|---|---|---|---|---|---|
| Daftar proyek | "Belum ada proyek aktif. Jalankan `claude` di folder proyek." + "Buka Riwayat" | Kerangka setelah 300 ms | Terputus: daftar terakhir + bilah | Baris live | Proyek tidak aktif di bagian sendiri |
| Pita indikator | "Belum ada run · sesi utama menunggu prompt", progres "-", token "-" | Kerangka | Terputus: nilai terakhir + "diperbarui 14.05" | Tiga nilai live | Token belum terbaca: "menunggu data"; tanpa pembanding: total saja |
| Kotak pemberitahuan | Tidak tampil | - | - | Item per pemicu | Lebih dari 2: "+N lainnya" |
| Grafik | Crew bawaan Menunggu + "Kirim prompt di Claude Code. Node menyala saat agent mulai." | "Menghubungkan ke server..." setelah 300 ms | Terputus: grafik terakhir, animasi berhenti | Node live | Di luar flow: redup; > 12 agent: pas layar memuat semua |
| Detail agent | Belum jalan: definisi + "Belum jalan di run ini." | Kerangka kepala; saat pembaruan isi lama tetap | "Detail gagal dimuat." + "Coba lagi" | Kepala + rincian | Bagian tanpa data: satu baris ("Tidak ada file berubah"); run lama: bagian tak tersimpan "Tidak disimpan di Riwayat." |
| Tab Backlog | "Proyek ini belum punya backlog." | Kerangka | "Backlog tidak bisa dibaca: <alasan>" | Baris jawaban + bagian | Tanpa irisan: per jenis + catatan; 1-2 item: tetap per bagian, baris jawaban tetap; data lama saat memuat ulang: isi lama tetap |
| Riwayat | "Belum ada run tersimpan. Run disimpan otomatis begitu prompt pertama selesai." | Kerangka daftar | Penyimpanan tidak aktif: "Riwayat tidak tersimpan di perangkat ini." | Ringkasan + tren + daftar | 1 run: tanpa tren dan tanpa selisih ("tanpa pembanding"); field lama kosong: "Tidak disimpan di Riwayat." |
| Laporan token | Tombol tidak tersedia: "Belum ada run untuk dilaporkan" | "Menyusun laporan...", tombol tidak bisa ditekan ulang | "Laporan gagal disusun." + "Coba lagi" | Lapisan laporan | 1 run: tiga penyumbang tetap (agent); > 200 run: catatan batas; run belum dianalisis: catatan jumlah |
| Ringkasan run | Tanpa file: "Tidak ada perubahan file." | Kerangka | "Ringkasan gagal dimuat." + "Coba lagi" | Enam bagian | Run gagal: "Berhenti karena gagal di <agent>" |
| Run lama | - | Kerangka grafik | "Run ini gagal dibuka." + "Kembali ke live" | Live hanya baca | Aksi tulis disembunyikan |
| Tab Percakapan, File, Skill, Token, Log | Seperti v1.0 | Seperti v1.0 | Seperti v1.0 | | |
| Global | - | - | Terputus: bilah menetap | - | Notifikasi ditolak: "Notifikasi diblokir" + petunjuk; bunyi diblokir: dilewati |

## 10. Istilah

Dipakai `ux-writing-id`; sumber kebenaran `GLOSSARY.md`. Sapaan "kamu".

| Istilah | Makna (satu saja) | Hindari di layar |
|---|---|---|
| Proyek | Folder tempat sesi Claude Code dimulai; namanya = nama folder | nama lain dari backlog ("Flow Viewer v2") |
| Run | Satu putaran kerja (ADR 0001) | job |
| Sesi utama | Claude yang menerima prompt; node "Claude" | Orkestrator |
| Butuh input | Claude atau agent menunggu jawaban, izin, atau keputusanmu | "butuh jawabanmu", "tanya kamu" |
| Bagian | Irisan backlog (`slice`), nama biasa ("Detail node") | fase, be, fe |
| Macet | Bagian dengan item gagal, atau item tersisa tanpa yang siap/berjalan | blocked |
| Agent diam | Berjalan tanpa event > 10 mnt; penanda "Diam <n> mnt" | idle |
| Boros | Setara > 150% pembanding | |
| Pembanding | Run terbaru di proyek dan flow yang sama dengan setara > 0 | run sebelumnya (bila bukan pembanding) |
| Terdeklarasi / terbukti | Tertulis di definisi agent / terlihat dipakai di run | terdaftar, belum diverifikasi |
| Token (setara) | Perkiraan beban, bukan tagihan; semua persen dari setara | |
| Laporan token | Laporan token satu proyek dari run tersimpan | Laporan (tanpa objek) |

## 11. Asumsi dan pertanyaan terbuka

Asumsi (diputuskan di tahap ini):
- U1-U8 dari v1.0 tetap, kecuali: U2 diperluas (detail = satu kolom, bukan empat tab); id `#drawer`/`#dh`/`#dtabs`/`#dbody` tetap ada sebagai wadah (arsitek memetakan bila tes memakai `#dtabs`).
- U9. Label jenis backlog dari `type`: ui -> Tampilan, fe -> Penyambungan, be -> Server, qa -> Uji, sec/cyber -> Keamanan, review/review-kode -> Review, keputusan -> Keputusan; jenis lain ditampilkan apa adanya dengan huruf besar di awal.
- U10. Item "siap" = belum selesai dan semua `needs` selesai (aturan skrip backlog). Item keputusan yang belum siap tampil sebagai "menunggu dependensi", bukan "perlu keputusan".
- U11. Item ditolak ikut grup Diparkir dengan label "Ditolak"; tidak dihitung.
- U12. Selisih per baris Riwayat dan aksi "Bandingkan" memakai aturan pembanding 4a; bukan fitur baru, hanya menampilkan F8 perilaku 4 dan Boros lebih awal.
- U13. Laporan token tidak memakai ambang "kebiasaan boros" baru; kebiasaan ditampilkan sebagai angka urut. Ambang baru akan menjadi keputusan PRD.
- U14. Teks peringatan memakai data yang sudah ada di event/transkrip; bila penyebab tidak tercatat, teks menyebut itu ("Gagal tanpa alasan tercatat").
- U15. Salinan markdown `laporan-token.md` mengikuti urutan dan persen setara yang sama dengan lapisan laporan (F12: "salinan yang sama").

Pertanyaan terbuka (bisnis):
- Q1-Q3 = tiga persetujuan di bagian 1.
- PRD Q2 (gejala bug Laporan): terjawab. Pemilik: "tombol Laporan per baris menimpa Buka (klik Buka malah buka laporan)", sama dengan temuan audit. Dipakai sebagai uji regresi R1 (§8 T6).
- Label tombol buka run lama: terjawab, "Buka" (§8 T6). PRD sudah memakai "Buka"; bila berubah, PRD mengikuti UX.md.

Catatan untuk arsitek/fe (bukan untuk pemilik):
- `tabs/backlog.js`: label "perlu keputusan" diambil dari `i.owner` tanpa melihat status; `.box.q` menggabungkan judul tanpa pemisah.
- `tabs/agent.js`: `failReason` tidak dirender; `selectAgent` me-reset `agentTab`.
- `history.js`: tombol `trep` per baris dengan `data-project` bisa kosong.
- Laporan: kolom % dihitung dari mentah.

## Lampiran A. Audit tampilan berjalan (2026-11-03)

Dilihat di `localhost:4777` (data nyata proyek ini) dan server tiruan `test/ui/mock-server.mjs` (skenario running, failed), 1440 x 900, tema terang. Screenshot: scratchpad sesi `fcf11413` (`ux/01-live.png` ... `ux/05-laporan.png`, `ux/m-running-live.png`, `ux/m-failed-detail.png`). Urutan per layar: kejujuran angka -> apakah mata jatuh di masalah -> hierarki -> kalimat yang seharusnya angka -> sisanya.

### Backlog (F11). Putusan: tidak menjawab pertanyaannya, dan sebagian jawabannya keliru.
Yang sudah baik: persen + "9 dari 77 item selesai" sama dengan sel Progres; item keputusan punya warna sendiri; item menunggu menyebut dependensinya.
- [Blocker] Keputusan yang sudah dijawab tetap berlabel "perlu keputusan" (mis. "Riwayat menyimpan 200 run per proyek", bukti "disetujui pemilik"). Pemilik mengira masih ada 6 keputusan. Where: `tabs/backlog.js` baris 15-16. Fix: label dari status + kesiapan (U10). Ref: dashboard-design Honest.
- [Blocker] Kotak "Butuh keputusanmu" menampilkan keputusan yang belum siap dan menggabung dua judul tanpa pemisah ("...replay nyataPemilik menerima..."). Fix: hanya item keputusan siap, satu baris per item dengan pertanyaannya. Ref: F11 AC.
- [Major] Pengelompokan per jenis teknis ("Per fase: keputusan, be, qa, sec, review-kode, fe, ui...") lalu 77 item datar. Ini keluhan "kek gatau ini bagian apa". Fix: §6.3. Ref: ux-designer 05 "Organizing by org structure"; F11.
- [Major] Tidak ada baris "apa berikutnya" dan tidak ada urutan masalah; item gagal/keputusan harus dicari dengan gulir. Fix: baris jawaban + urutan bagian. Ref: dashboard-design Monitor.
- [Major] Lencana rel Backlog "77" = total item, selalu menyala, tidak pernah berarti masalah. Fix: §5 Lencana rel. Ref: dashboard-design Quiet; DESIGN keputusan 2026-10-27.
- [Minor] Baris item memuat id mentah ("menunggu: critic-b1-r2, critic-b2-r2, qa-a-acceptance") dan nama agent. Fix: judul item yang ditunggu; agent/id hanya saat dibuka. Ref: F11 AC.

### Detail agent (F4). Putusan: tumpukan data sama berat; jawaban tidak ada di atas.
Yang sudah baik: detail di panel, grafik tetap terlihat dan bisa dipakai; status punya teks.
- [Blocker] Agent gagal: alasan gagal ("2 tes merah (auth.test.js:41)") tidak tampil di detail sama sekali. Where: `tabs/agent.js` (tanpa `failReason`); `m-failed-detail.png`. Fix: peringatan §6.2. Ref: F4 AC peringatan.
- [Blocker] Di 1440 x 900 tanpa gulir tidak terlihat satu kalimat jawaban dan jumlah putaran; token dan durasi terdorong ke bawah oleh "Peran" (deskripsi frontmatter berbahasa Inggris) dan "Tugas" (prompt utuh 25+ baris). Where: `03b-detail-running.png`. Fix: urutan §6.2. Ref: F4 AC; ref 18 overview first.
- [Major] Model "(belum diverifikasi)" dan skill belum terbukti hanya berupa baris di "Konfigurasi" paling bawah. Fix: peringatan di atas. Ref: F4 AC; dashboard-design "attention lives on the data".
- [Major] Pindah agent mengembalikan tab ke Ringkasan, jadi cek file agent berikutnya 2 langkah, bukan 1 (bertentangan dengan T4 v1.0). Fix: bagian terbuka diingat (§5).
- [Major] Kalimat teknis di layar: "Token belum terbaca. Hook belum mengirim transcript_path, atau file transcript agent ini belum ditemukan (cek ~/.claude/flow-viewer/events.jsonl)." Fix: "menunggu data" di angka; penyebab teknis di tooltip. Ref: dashboard-design Wordless.
- [Minor] Label teknis: "Effort", "Tool diizinkan", "Skill terdaftar", tab "Pemanggilan". Fix: judul bagian §6.2; "terdeklarasi" (GLOSSARY).

### Live. Putusan: berjalan dan jujur sebagian besar; mata jatuh di rincian token, bukan di "perlu pindah ke Claude?".
Yang sudah baik: node bermasalah punya lencana; pita menempel; "terhubung" terlihat; pengalih proyek di kiri.
- [Blocker] Pertanyaan Claude tidak terbaca tanpa klik: hanya pil "2 butuh jawabanmu" di kanan atas, tanpa kotak pemberitahuan. Where: `m-running-live.png`. Fix: kotak di bawah pita (§6.1). Ref: F5 AC terakhir.
- [Major] Sel terlebar pita = "Beban token per agent" (rincian porsi per agent), sementara jawaban pertanyaan layar ada di sel kecil "Berjalan" dan pil kanan. Fix: §6.1 urutan; porsi per agent ke tab Token. Ref: dashboard-design hierarki; ref 18 layout.
- [Major] Node sesi utama "Claude (Orkestrator)" berstatus "menunggu" saat ia sedang menjalankan dua agent; kartu "Sesi utama" di bawahnya mengulang model/skill/tool. Fix: status §6.1, satu node. Ref: Honest, "say it once"; GLOSSARY hindari "orchestrator".
- [Major] Agent gagal di grafik: hanya "gagal", alasan satu baris tidak ada di node (UX v1.0 penandaan node). Fix: alasan satu baris di node.
- [Minor] Label "Progres alur 8%" padahal sumbernya backlog. Fix: "Progres" + "Backlog 9 dari 77 item".
- [Minor] Legenda grafik memuat 4 dari 6 status (tanpa Gagal, Dilewati); istilah "butuh jawabanmu"/"tanya kamu" vs "Butuh input".
- [Minor] Nama proyek "Flow Viewer v2" di pengalih, "flow-viewer" di laporan. Fix: nama folder di semua tempat (§10).

### Riwayat (F8). Putusan: daftar ada, pertanyaan "lebih boros dari sebelumnya?" tidak terjawab tanpa centang.
Yang sudah baik: "sedang berjalan" ditandai; "Lihat live" untuk run berjalan; centang ketiga melepas yang paling lama.
- [Blocker] Tombol "Laporan" di tiap baris menimpa tombol Buka/Analisis (terlihat potongan "["), dan proyek kosong jatuh ke folder kerja server. Where: `history.js`; `04-riwayat.png`. Fix: satu "Laporan token" di kepala (§6.4). Ref: F12 AC 1-2.
- [Major] Tidak ada selisih terhadap pembanding dan tidak ada tanda Boros per baris. Fix: §6.4. Ref: F8 AC Boros.
- [Major] Panel 400 px terlalu sempit untuk baris + aksi. Fix: Riwayat selebar layar (persetujuan 1).
- [Minor] Judul baris = potongan prompt mentah (`<pasted_content id=...>` di laporan). Fix: judul run atau "<flow> · <jam>".

### Laporan token (F12). Putusan: datanya lengkap, tapi pertanyaannya tidak dijawab di atas dan satu angka tidak konsisten.
Yang sudah baik: judul memuat nama proyek; Esc, Tutup, klik di luar menutup; jumlah run belum dianalisis disebut.
- [Blocker] Tidak ada tiga penyumbang terbesar di atas; laporan dibuka dengan paragraf definisi dan ringkasan teks. Where: `05-laporan.png`. Fix: §6.5. Ref: F12 AC; Wordless.
- [Major] Kolom "%" per agent dihitung dari mentah (ui-designer 69%), sedangkan setara adalah ukuran resmi (7,0 dari 11,0 jt = 64%). Dua jawaban untuk satu pertanyaan. Fix: persetujuan 3. Ref: Honest.
- [Major] Tidak ada state memuat dan galat: gagal hanya menampilkan "Laporan tidak tersedia." tanpa "Coba lagi", dan tombol bisa ditekan berulang. Fix: §9. Ref: F12 AC.
- [Minor] Tabel pemanggilan termahal 10 kolom terpotong di kanan; nama item berisi potongan prompt Inggris. Fix: kolom §6.5, nama "<agent> · pemanggilan <n>". Ref: ref 21 maks kolom.
