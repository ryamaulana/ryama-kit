# UX: Flow Viewer v2
Sumber: docs/PRD.md (Locked v1.0) · Bahasa UI: id · Tahap: ux · Tanggal: 2026-10-27
Pembanding "langkah awal" = viewer versi 1.7.1 (`server/public/index.html` saat ini).

## 1. Ringkasan untuk pemilik

- **Lima tugas utama:** membuka proyek, cek sekilas, tahu saat dibutuhkan, memeriksa satu agent, menilai hasil run.
- **Langkah berkurang:** cek sekilas termasuk banding token 4-6 langkah menjadi 0; tahu, membaca pertanyaan agent, lalu pindah ke Claude 3-4 langkah (dan bisa terlewat) menjadi 2, hanya 1 di viewer; menilai hasil run 6 menjadi 1 (ringkasan muncul sendiri); memeriksa agent berikutnya 2 menjadi 1.
- **Satu layar kerja, bukan enam tab.** Atas: tiga angka yang selalu terlihat (siapa kerja, progres, token dibanding run sebelumnya). Tengah: grafik alur. Kanan: satu panel untuk Percakapan, Backlog, File, Skill, Token, Log, dan detail agent. Grafik tidak pernah tertutup.
- **Saat kamu dibutuhkan:** judul tab berkedip, bunyi, notifikasi desktop, dan kotak pemberitahuan tepat di bawah tiga angka berisi pertanyaan beserta pilihannya. Node agent yang menunggu ikut ditandai.
- **Riwayat jadi halaman sendiri**; tiga angka dan kotak pemberitahuan tetap terlihat di sana agar pemantauan live tidak putus.
- **Perlu persetujuan (ya/tidak):**
  1. Bila hanya ada satu proyek aktif, `localhost:4777` langsung membuka proyek itu tanpa melewati daftar. Rekomendasi: **ya** (hemat 1 langkah tiap kali buka).
  2. Ringkasan run muncul otomatis hanya bila run memakai minimal satu agent atau mengubah file; tanya-jawab singkat cukup diberi tombol "Ringkasan". Rekomendasi: **ya** (mencegah jendela ringkasan muncul tiap balasan pendek). PRD F6 saat ini berbunyi "setiap run selesai".
  3. Pengalih proyek menampilkan tanda kecil bila **proyek lain** butuh input (tanpa bunyi atau notifikasi dari proyek lain). Rekomendasi: **ya** (proyek yang tidak punya tab terbuka tetap tidak terlewat).

## 2. Tugas dan langkah

Langkah = aksi pengguna (klik, pindah tab/jendela, centang, tekan tombol). Membaca tidak dihitung. Rincian hitungan ada di bagian 5.

| Tugas | Langkah awal (1.7.1) | Langkah rancangan | Apa yang dihapus |
|---|---|---|---|
| T1. Membuka proyek yang sedang jalan | 1, tetapi data dua proyek tercampur dan tidak bisa dipisah | 2 (buka alamat, klik proyek); 1 bila satu proyek aktif (persetujuan 1) | Status global tunggal; daftar sebagai layar pembatas saat hanya ada satu proyek |
| T2. Cek sekilas: siapa kerja, sampai mana, berapa token dan selisihnya dengan run sebelumnya | 4-6 (tampilkan panel samping bila tersembunyi, kembali ke tab Live bila di tab lain, buka Riwayat, centang 2 run, kembali ke Live) | 0, dari layar mana pun | Banding token manual untuk kasus paling umum; status yang tersebar di chip, strip, dan panel samping |
| T3. Tahu ada pertanyaan/izin/keputusan, membacanya, lalu pindah ke Claude | 3-4 (cek tab viewer sendiri tanpa pemicu, tampilkan panel bila tersembunyi, gulir percakapan, pindah ke Claude) | 2 (klik notifikasi atau tab yang berkedip, pindah ke Claude); di dalam viewer: 1 | Mencari pertanyaan di percakapan; ketergantungan pada "kebetulan sedang melihat" |
| T4. Memeriksa satu agent (model, skill, hasil) lalu diff satu file; lalu agent berikutnya | 3, lalu 2 per agent berikutnya (tab detail kembali ke Ringkasan tiap ganti node) | 3, lalu 1 per agent berikutnya | Reset tab detail; laci detail yang menutupi grafik dan panel samping |
| T5. Menilai hasil run yang selesai (langkah dilewati, token vs sebelumnya, file, keputusan tersisa) | 6 (Riwayat, centang 2 run, kembali ke Live, buka Backlog, kembali ke Live) | 1 (tutup ringkasan yang muncul sendiri); membuka lagi nanti: 1 dari tampilan live, 2 dari Riwayat | Pengumpulan manual dari empat tempat |
| T6. Membandingkan dua run lama | 3 (Riwayat, centang 2 run) | 3 | Tidak ada; sudah minimal. Ditambah peringatan bila flow berbeda (F8) |

## 3. Peta layar dan navigasi

```
/                         Daftar proyek
/?p=<proyek>              Tampilan proyek
   ├─ Live (default)      bilah atas + pita indikator + [kotak pemberitahuan] + grafik + panel samping
   │    ├─ panel samping: tab data proyek  Percakapan | Backlog | File | Skill | Token | Log
   │    ├─ panel samping: detail node      Ringkasan | Aktivitas | File | Hasil   (menimpa tab data sementara)
   │    └─ lapisan Ringkasan run           (di atas grafik dan panel, di bawah pita indikator)
   ├─ Riwayat             tabel run, banding dua run, hapus
   └─ Run lama            tata letak Live, hanya baca, bilah "Kembali ke live"
```

| Keputusan | Alasan |
|---|---|
| Bilah atas dengan dua tampilan saja: **Live** dan **Riwayat** | Dua tujuan berbeda (memantau sekarang vs menilai masa lalu); sisanya data pendukung, bukan tujuan |
| Data pendukung (F9) pindah ke **tab di panel samping**, bukan tab halaman | Grafik dan tiga angka tetap terlihat saat membaca Backlog/Log; setiap data paling jauh 2 klik |
| **Pengalih proyek** di kiri bilah atas (nama proyek + menu) | Lokasi saat ini selalu terlihat; pindah proyek 2 klik tanpa kembali ke daftar |
| Pita indikator dan kotak pemberitahuan **menempel di atas** (tidak ikut tergulung) di Live, Riwayat, dan Run lama | F3: tidak boleh tergulung keluar layar; pemantauan tidak putus saat membuka Riwayat |
| Tampilan Live **tidak menggulung sebagai halaman**; grafik digeser/zoom, panel menggulung di dalamnya | Tiga angka dan grafik selalu dalam satu layar laptop |
| Tidak ada sidebar navigasi kiri | Hanya 2 tampilan; sidebar memakan lebar yang dibutuhkan grafik 12 agent |

Lebar layar:
- 1200 px ke atas: grafik dan panel berdampingan (panel default 400 px, bisa ditarik 320 px sampai 60% lebar, lebar diingat).
- 900-1199 px: panel default **tertutup** (menyisakan grafik 12 node yang terbaca); dibuka lewat rel ikon atau tombol dan, saat terbuka, mendorong grafik (bukan menimpa), lebar 340 px. Disetujui pemilik saat pemilihan arah desain (2026-10-27).
- Di bawah 900 px (PRD: boleh berupa daftar): grafik menjadi daftar kartu agent vertikal; panel samping menjadi lapisan penuh yang dibuka dari baris tab di bawah pita indikator.

## 4. Pola per tugas

| Tugas / bagian | Pola | Alasan |
|---|---|---|
| Daftar proyek | Halaman penuh, satu baris per proyek, baris = tautan biasa | Bisa Ctrl+klik atau klik tengah untuk tab baru (A1: satu tab per proyek) |
| Pindah proyek | Menu tarik-turun di bilah atas | Konteks proyek sekarang tetap terlihat; isi 1-3 proyek |
| Tiga indikator (F3) | Pita menempel, satu baris, tiga sel; tiap sel bisa diklik sebagai jalan pintas | Sekali lirik tanpa klik; jalan pintas menghemat langkah ke data rincinya |
| Detail node (F4) | **Panel samping**, mengisi tempat panel data yang sama (bukan laci yang menimpa grafik) | Konteks (grafik) harus tetap terlihat dan bisa dipakai; isi sempit dan panjang. Karena panel sudah ada, membuka detail tidak mengubah lebar grafik, jadi posisi/zoom tidak bergeser |
| Data pendukung (F9) | Tab di panel samping; panel bisa diciutkan menjadi **rel ikon** setengah tersembunyi | Rel tetap memberi jalan 1 klik ke tiap tab dan menampilkan lencana (jumlah keputusan, file, skill belum terbukti) |
| Pemberitahuan butuh input/gagal (F5) | **Kotak pemberitahuan menetap** di bawah pita indikator + judul tab + bunyi + notifikasi desktop | Mendesak tapi tidak memblokir; viewer read-only, jadi tidak ada yang perlu dikerjakan di viewer |
| Run selesai (F5, F6) | Lapisan **Ringkasan run** (dialog besar di atas grafik dan panel, pita indikator tetap terlihat) | "Satu layar" dan pemantauan sudah berhenti, jadi menutup grafik sementara tidak merugikan; Esc menutup |
| Riwayat (F8) | Halaman penuh di dalam tampilan proyek | Tabel lebar dan banding butuh ruang |
| Lihat run lama | Tata letak Live yang sama, mode hanya baca, bilah penanda menetap | Pemilik membaca run lama dengan cara yang sama seperti run live |
| Reset run, hapus run | Tombol dua langkah ("Reset run" lalu "Yakin? Klik lagi" dalam 3 detik) | Dipertahankan dari F9; tindakan merusak tanpa undo, tapi tidak perlu dialog |
| Izin notifikasi desktop | Tombol di bilah atas + tawaran sekali di kotak pemberitahuan pertama | Diminta saat nilainya terlihat, tidak saat kunjungan pertama (A7) |

### Isi tiap bagian

**Bilah atas** (kiri ke kanan): nama produk · pengalih proyek (nama proyek, path singkat bila nama kembar, menu daftar proyek aktif + "Semua proyek") · label flow ("Flow: build" / "Tanpa flow") · navigasi Live | Riwayat · status koneksi · tombol bunyi (aktif/senyap) · tombol notifikasi desktop · tombol tema · tombol ciutkan/tampilkan panel · menu Lainnya (Reset run, Laporan teks `/report`).

**Pita tiga indikator** (urutan sesuai PRD dan pentingnya lirikan; sel pertama paling lebar, sekitar setengah pita):
1. **Siapa kerja.** Baris 1: status sesi ("2 agent berjalan" / "Menunggu kamu: jawab pertanyaan" / "Tidak ada agent yang berjalan"). Baris 2: nama agent + aktivitas terakhir, maksimal 2 agent lalu "+N lainnya"; bila tidak ada agent, status sesi utama. Putusan flow 1.7.1 ("flow sesuai", "2 langkah dilewati") tampil di sini setelah run selesai. Klik: membuka detail agent yang berjalan (bila satu) atau tab Percakapan.
2. **Progres.** Angka persen + batang + sumber: "Backlog 12 dari 20 item" atau "Langkah wajib 3 dari 5"; tanpa keduanya: "-". Baris kecil: durasi run berjalan. Item backlog yang diparkir tidak dihitung. Klik: tab Backlog (bila ada backlog) atau tab Log.
3. **Token.** Setara input total + selisih dengan run sebelumnya pada proyek dan flow yang sama, ditulis dengan kata dan tanda ("+12% dari run sebelumnya", bukan warna saja). Tanpa pembanding: hanya total dan angka mentah. Klik: tab Token.

**Kotak pemberitahuan** (muncul hanya bila ada perhatian yang belum selesai): satu item per pemicu, terbaru di atas, maksimal 2 terbuka lalu "+N lainnya". Isi item: jenis (Pertanyaan, Izin, Keputusan backlog, Gagal), agent asal, waktu, teks lengkap pertanyaan beserta semua pilihan jawaban, teks bantu "Jawab di aplikasi Claude." dan satu tautan sekunder (Pertanyaan/Izin: "Lihat percakapan"; Gagal: "Lihat detail"; Keputusan: "Lihat backlog"). Tinggi maksimal sekitar 30% layar, isi menggulung di dalam.

**Grafik (F2):** kolom fase dari definisi flow; node Prompt, Claude (sesi utama), lalu agent. Isi kartu agent: nama, status (ikon + teks), putaran ("2x"), durasi, aktivitas terakhir, cuplikan hasil, token, model (dengan tanda bukti model), effort, jumlah file, penanda BG untuk agent latar belakang. Node sesi utama juga menampilkan model sesi, skill dipanggil, tool dipakai. Node di luar flow: redup dengan teks "tidak dipakai di flow ini"; agent tanpa command flow: "di luar flow". Kontrol zoom (perkecil, persen, perbesar, "Pas layar") di pojok kiri bawah grafik; Ctrl+scroll zoom di sekitar kursor; klik dua kali latar = pas layar. Node terpilih bertanda jelas selama detailnya terbuka.

**Penandaan node:**
| Kejadian | Tanda di node | Hilang saat |
|---|---|---|
| Butuh input (pertanyaan/izin dari agent atau sesi utama) | Status "Butuh input" (ikon + teks), cuplikan 1 baris pertanyaan | Event berikutnya dari sesi itu tiba (F5) |
| Gagal | Status "Gagal" + alasan singkat 1 baris | Agent jalan lagi |
| Keputusan backlog | Tidak menandai node (tidak terikat agent); lencana di tab Backlog dan item di kotak pemberitahuan | Item backlog tidak lagi "perlu keputusan" |
| Dilewati | Status "Dilewati" | Agent jalan |

**Panel samping, mode data proyek** (tab default: Percakapan; tab terakhir diingat per browser):
| Tab | Isi (semua data 1.7.1) | Lencana |
|---|---|---|
| Percakapan | Prompt, balasan Claude, pesan agent, pertanyaan + pilihan, izin, jawabanmu, notifikasi, error; pesan panjang dilipat, klik membuka | Titik bila ada pertanyaan/izin yang belum dijawab |
| Backlog | Persen, jumlah item, batang status, fase, grup: Perlu keputusanmu, Berjalan/siap, Menunggu giliran, Ide/nanti (diparkir), Selesai (3 terakhir + "+N lainnya") | Jumlah "perlu keputusan", lalu persen |
| File | Daftar file berubah (nama, folder, agent, +baris/-baris, berapa kali diedit, baru/edit); klik baris membuka diff di tempat | Jumlah file |
| Skill | Skill yang sedang/terakhir dipanggil per agent yang berjalan, Belum terbukti per agent, Panggilan terakhir | Jumlah agent dengan skill belum terbukti |
| Token | Total setara input, mentah, jumlah agent; batang porsi; tabel per agent (model, masuk, keluar, cache baca, cache tulis, setara, persen) | - |
| Log | Linimasa agent (kapan mulai/selesai, tumpang tindih saat paralel, jam mulai, putaran) lalu daftar kejadian (waktu, jenis, kejadian) | - |

**Panel samping, mode detail node** (judul: ikon, nama agent, peran, chip model, tombol tutup). Tab terakhir diingat saat berganti node:
- **Ringkasan:** bila node butuh input/gagal, kotak pertanyaan atau alasan di paling atas; lalu status, putaran, durasi, jumlah tool, jumlah file; cuplikan hasil dengan tautan "Lihat hasil penuh" (ke tab Hasil); bukti model (diminta di definisi vs dipakai sebenarnya, sumber, putusan Sesuai/Beda/Belum terbukti); effort; token (setara, mentah, konteks terakhir, giliran, porsi input/output/cache, rumus beban); pemakaian (gambar dibaca, file dibaca ulang, audit); skill (dipanggil, termuat, belum terbukti); peran; tool yang diizinkan; pemakaian tool per jenis.
- **Aktivitas (n):** tool call berurutan terbaru di atas; klik baris membuka diff, command + output, file dibaca, prompt subagent, hasil dan durasi.
- **File (n):** file yang diubah agent ini, klik membuka diff.
- **Hasil:** tugas yang diberikan dan jawaban akhir penuh.
- Agent yang belum jalan: Ringkasan menampilkan definisi (peran, model, skill terdeklarasi, tool diizinkan); tab lain berisi "Agent ini belum jalan di run ini."
- Node Prompt: klik membuka tab Percakapan pada prompt itu.

**Ringkasan run (F6)**, urutan dari atas:
1. Keputusan yang masih menunggumu (item backlog perlu keputusan, pertanyaan yang belum dijawab). Tidak ada: bagian tidak tampil.
2. Hasil run: "Selesai", "Selesai dengan 2 langkah dilewati", atau "Berhenti karena gagal di <agent>".
3. Langkah: tiap langkah flow dengan nama agent dan status (selesai, dilewati, gagal, tidak dipakai). Langkah dilewati dan gagal di atas.
4. Token dan durasi total, masing-masing dengan selisih terhadap run sebelumnya (flow sama). Tanpa pembanding: hanya angka.
5. File yang berubah (+/- baris per file); klik membuka diff di tab File panel samping. Tidak ada: "Tidak ada perubahan file."
6. Tombol: "Tutup" (utama), "Buka Riwayat".

**Riwayat (F8):** keterangan penyimpanan (SQLite/JSON/tidak aktif, maks 200 run); kotak centang "Semua proyek" (default mati = proyek ini); tren token 12 run terakhir; area banding; tabel run: pilih (centang), waktu + durasi, perintah (+ nama proyek bila semua proyek), flow, jumlah agent, token, file, aksi "Lihat", "Ringkasan", "Hapus" (dua langkah). Run live ditandai "live" tanpa tombol Hapus.

**Daftar proyek (F1):** satu baris per proyek aktif (event dalam 6 jam): nama proyek (+ path singkat bila nama kembar), status (Butuh input / Berjalan: nama agent / Selesai / Diam), progres, token, waktu kejadian terakhir, jumlah pemberitahuan terbuka. Urutan: butuh input dulu, lalu yang terbaru aktif. Di bawah: "Proyek lama ada di Riwayat" (membuka Riwayat semua proyek) dan teks bantu "Buka tiap proyek di tab sendiri agar pemberitahuannya jalan."

### Pola pemberitahuan (F5)

| Pemicu | Judul tab | Bunyi | Notifikasi desktop | Di layar |
|---|---|---|---|---|
| Pertanyaan / izin | `(n) Butuh input · <proyek>` | Ya | Ya, bila tab tidak terlihat | Item kotak pemberitahuan + node "Butuh input" + titik di tab Percakapan |
| Keputusan backlog | `(n) Butuh input · <proyek>` | Ya | Ya, bila tab tidak terlihat | Item kotak pemberitahuan + lencana tab Backlog |
| Agent gagal/error | `(n) Gagal · <proyek>` | Ya | Ya, bila tab tidak terlihat | Item kotak pemberitahuan + node "Gagal" |
| Run selesai | `(n) Selesai · <proyek>` | Ya | Ya, bila tab tidak terlihat | Ringkasan run (lihat persetujuan 2) |

Aturan:
- `n` = jumlah pemberitahuan terbuka. Label judul mengikuti yang paling mendesak: Butuh input, lalu Gagal, lalu Selesai.
- Judul berkedip (bergantian dengan judul normal) hanya saat tab tidak terlihat. Judul normal: `<proyek> · Flow Viewer`.
- Butuh input bertahan sampai terjawab (event berikutnya). Gagal dan Selesai dihapus dari hitungan judul begitu tab dilihat; item Gagal di kotak tetap ada sampai ditutup atau agent jalan lagi.
- Pemicu yang sama tidak memicu ulang bunyi atau notifikasi.
- Klik notifikasi desktop: memfokuskan tab viewer proyek itu.
- Bunyi aktif secara default; tombol senyap di bilah atas, pilihan diingat. Bila browser memblokir bunyi sebelum ada klik, bunyi dilewati diam-diam.
- Notifikasi desktop: tombol "Aktifkan notifikasi" di bilah atas. Saat pemberitahuan pertama muncul dan izin belum pernah diminta, item itu memuat tawaran satu baris dengan tombol yang sama (sekali saja).
- Pemberitahuan hanya milik proyek tab itu. Pengecualian yang diusulkan (persetujuan 3): titik kecil + jumlah pada pengalih proyek bila proyek lain butuh input.

## 5. Alur utama

### T1. Membuka proyek
1. Pemilik membuka `localhost:4777` (langkah 1).
2. Satu proyek aktif: tampilan proyek langsung terbuka (persetujuan 1). Selesai: **1 langkah**.
3. Lebih dari satu: Daftar proyek tampil; klik baris proyek (langkah 2), atau Ctrl+klik untuk tab baru. Selesai: **2 langkah**.
4. Pindah ke proyek lain dari tampilan proyek: klik pengalih proyek (1), pilih proyek (2).
- Gagal: tidak ada proyek aktif → keadaan kosong daftar (lihat bagian 6). Alamat `?p=` tidak dikenal → "Proyek ini belum punya kejadian." + tautan "Daftar proyek" dan "Riwayat". Server mati → browser menampilkan halaman tidak terjangkau; petunjuk menjalankan `/flow-viewer:flow` ada di README dan di keadaan terputus.

### T2. Cek sekilas
1. Pemilik melirik pita indikator: siapa kerja, progres, token + selisih. **0 langkah**, berlaku di Live, Riwayat, Run lama, saat detail atau ringkasan terbuka.
2. Opsional, untuk rincian: klik sel indikator (1) → tab panel terkait.
- Gagal: koneksi terputus → bilah "Terputus dari server. Menyambung ulang otomatis; data di layar mungkin sudah lama." dan pita menampilkan jam pembaruan terakhir. Token belum terbaca → "menunggu data". Tanpa flow dan backlog → progres "-".
- Hitungan awal (1.7.1): status agent ada di panel samping (1 bila diciutkan), strip hanya ada di tab Live (1 bila di tab lain), banding token: Riwayat (1), centang run sebelumnya (1), centang run ini (1), kembali ke Live (1) = 4-6.

### T3. Tahu dan membaca pertanyaan, lalu menjawab di Claude
1. Agent bertanya. Viewer: judul tab `(1) Butuh input · <proyek>` berkedip, bunyi, notifikasi desktop, node "Butuh input", item kotak pemberitahuan.
2. Pemilik mengklik notifikasi desktop atau tab yang berkedip (langkah 1). Pertanyaan dan pilihannya sudah terbaca di kotak pemberitahuan (0 langkah tambahan).
3. Pemilik pindah ke aplikasi Claude dan menjawab (langkah 2, di luar viewer).
4. Event berikutnya tiba → item kotak, tanda node, dan penanda judul hilang. Pemilik kembali ke viewer kapan pun (tidak dihitung; pemantauan).
- Gagal: izin notifikasi ditolak → judul tab dan bunyi tetap jalan; tombol bilah atas berubah menjadi "Notifikasi diblokir" dengan petunjuk cara mengizinkan. Tidak ada tab viewer terbuka → tidak ada pemberitahuan (batas browser; tertulis di petunjuk tombol notifikasi dan di Daftar proyek). Beberapa pemicu → judul `(n) ...`, item terbaru di atas. Bunyi diblokir browser → dilewati tanpa error.
- Hitungan awal (1.7.1): pindah ke tab viewer atas inisiatif sendiri (1), tampilkan panel bila diciutkan (1), gulir percakapan ke pertanyaan (1), pindah ke Claude (1) = 3-4.

### T4. Memeriksa satu agent, lalu agent berikutnya
1. Klik node agent di grafik (langkah 1). Panel samping berganti ke detail, tab Ringkasan: model diminta vs dipakai, skill, cuplikan hasil, token. Grafik tetap di tempat dan bisa dipakai.
2. Klik tab File (langkah 2), klik file (langkah 3) → diff terbuka di tempat. **3 langkah.**
3. Klik node agent lain (langkah 1): detail berganti, tab File diingat, daftar file agent itu langsung tampil. **1 langkah per agent berikutnya.**
4. Esc atau tombol tutup → panel kembali ke tab data terakhir; posisi dan zoom grafik tidak berubah.
- Detail tetap diperbarui saat run berlanjut; posisi gulir dan baris yang terbuka dipertahankan.
- Gagal: detail gagal dimuat → isi lama tetap tampil + "Detail gagal dimuat. Coba lagi" (tombol "Coba lagi"). Agent belum jalan → definisi agent. Panel sedang diciutkan → klik node membuka panel; menutup detail menciutkannya lagi.
- Hitungan awal (1.7.1): klik node (1), tab File (1), klik file (1) = 3; agent berikutnya: klik node (1), tab File lagi karena kembali ke Ringkasan (1) = 2.

### T5. Menilai hasil run
1. Run selesai → pemberitahuan (judul, bunyi, notifikasi) dan Ringkasan run terbuka sendiri. Pemilik membaca keputusan tersisa, langkah dilewati, token/durasi vs run sebelumnya, file berubah (0 langkah).
2. Tutup dengan Esc atau "Tutup" (langkah 1). **1 langkah.**
3. Membuka lagi: tombol "Ringkasan" di sel indikator Siapa kerja selama run belum berganti (1 langkah), atau Riwayat (1) + "Ringkasan" di baris run (2).
- Gagal: run berhenti karena error → hasil run "Berhenti karena gagal di <agent>", langkah gagal di atas. Tanpa file berubah → "Tidak ada perubahan file." Prompt baru masuk saat ringkasan terbuka → ringkasan tetap terbuka dengan baris "Run baru sudah berjalan", pita indikator sudah menampilkan run baru.
- Hitungan awal (1.7.1): Riwayat (1), centang run sebelumnya (1), centang run ini (1), kembali ke Live (1), buka Backlog untuk keputusan (1), kembali ke Live (1) = 6.

### T6. Membandingkan dua run
1. Klik Riwayat (1). 2. Centang run pertama (2). 3. Centang run kedua (3) → area banding muncul di atas tabel: token per agent lama, baru, selisih, total.
- Flow kedua run berbeda → peringatan "Flow berbeda (build vs ui-only). Perbandingan mungkin tidak setara."
- Centang run ketiga → centang paling lama dilepas otomatis (perilaku 1.7.1).
- Lihat run lama: "Lihat" (1) → tata letak Live hanya baca dengan bilah "Melihat run 27 Okt 14.02 · hanya baca" + "Kembali ke live". Pita indikator tetap menampilkan data live; angka run lama ada di bilah itu.
- Hapus: "Hapus" (1) → "Yakin?" (2) dalam 3 detik.

### Jangkauan data F9 (maksimal 2 klik dari tampilan Live)

| Data 1.7.1 | Jalan | Klik |
|---|---|---|
| Siapa kerja, progres, token, durasi run, putusan flow | Pita indikator | 0 |
| Status, aktivitas, cuplikan, token, durasi, model, putaran, BG per agent | Kartu node | 0 |
| Percakapan, Backlog, File, Skill, Token per agent, Log, Linimasa | Tab panel atau ikon rel | 1 |
| Diff satu file, isi satu pesan panjang | Tab File / Percakapan, lalu klik baris | 2 |
| Ringkasan detail agent (model, skill, token, pemakaian, peran, tool) | Klik node | 1 |
| Aktivitas, File, Hasil satu agent | Klik node, klik tab | 2 (3 untuk membuka satu tool call; 2 bila tab sudah diingat) |
| Riwayat | Bilah atas | 1 |
| Reset run, Laporan teks | Menu Lainnya | 2 (+1 konfirmasi reset) |
| Tema, bunyi, notifikasi | Bilah atas | 1 |

## 6. State per layar

| Layar | Kosong | Memuat | Galat | Sukses | Tanpa izin / khusus |
|---|---|---|---|---|---|
| Daftar proyek | "Belum ada proyek aktif. Jalankan `claude` di folder proyek; proyek muncul di sini begitu ada kejadian." + "Buka Riwayat" | Baris kerangka setelah 300 ms | Terputus: bilah terputus, daftar terakhir tetap tampil | Baris proyek, diperbarui live | - |
| Pita indikator | Belum ada run: "Belum ada run · sesi utama menunggu prompt", progres "-", token "-" | Kerangka tiga sel | Terputus: nilai terakhir + "diperbarui 14.05" | Tiga nilai live | Token belum terbaca: "menunggu data" |
| Grafik | Belum ada run: crew bawaan berstatus Menunggu + "Kirim prompt di Claude Code. Node menyala saat agent mulai." | "Menghubungkan ke server…" setelah 300 ms | Terputus: grafik terakhir, animasi berjalan dihentikan, bilah terputus | Node live | Agent di luar flow: redup "tidak dipakai di flow ini" |
| Kotak pemberitahuan | Tidak tampil | - | - | Item per pemicu | Izin notifikasi belum diminta: tawaran sekali; ditolak: tidak ditawarkan lagi |
| Tab Percakapan | "Belum ada percakapan. Prompt kamu dan balasan Claude muncul di sini." | Kerangka 3 pesan | "Percakapan gagal dimuat." + "Coba lagi" | Pesan, gulir otomatis bila di dekat bawah | - |
| Tab Backlog | "Belum ada backlog di proyek ini. Buat dengan /fullstack-dev:backlog." | Kerangka | Berkas backlog tidak terbaca: "Backlog tidak bisa dibaca." | Grup item | - |
| Tab File | "Belum ada file yang diubah." | Kerangka | Diff terpotong: "Detail diff sudah terpotong dari buffer." | Daftar file | - |
| Tab Skill | "Belum ada skill dipanggil." | - | - | Daftar | Tidak ada agent berjalan: "Tidak ada agent yang berjalan." |
| Tab Token | "Belum ada data token. Muncul setelah transkrip agent terbaca." | - | - | Tabel | - |
| Tab Log | "Belum ada kejadian." | - | - | Linimasa + daftar | - |
| Detail node | Agent belum jalan: definisi agent | Kerangka; saat pembaruan isi lama tetap | "Detail gagal dimuat." + "Coba lagi" | Empat tab | Run lama: Ringkasan dari data tersimpan; tab lain "Tidak disimpan di Riwayat." |
| Ringkasan run | Tanpa file: "Tidak ada perubahan file."; tanpa keputusan: bagian disembunyikan | Kerangka | Gagal dimuat dari Riwayat: "Ringkasan gagal dimuat." + "Coba lagi" | Enam bagian | Run gagal: hasil "Berhenti karena gagal di <agent>" |
| Riwayat | "Belum ada riwayat. Run tersimpan otomatis begitu ada aktivitas." | Kerangka tabel | Penyimpanan tidak aktif: "Riwayat tidak tersimpan di perangkat ini." | Tabel + tren | Run live: tanpa Hapus |
| Run lama | - | Kerangka grafik | "Run ini gagal dibuka." + "Kembali ke live" | Tata letak Live hanya baca | Semua aksi tulis disembunyikan |
| Global | - | - | Terputus: bilah menetap, menyambung ulang otomatis; tersambung lagi: bilah hilang | - | Notifikasi ditolak: tombol "Notifikasi diblokir" + petunjuk; bunyi diblokir: dilewati; login tidak ada (lokal) |

## 7. Istilah

Dipakai `ux-writing-id` dan disalin ke `docs/DESIGN.md` bagian "Istilah & nada". Sapaan "kamu".

| Istilah | Makna (satu saja) |
|---|---|
| Proyek | Folder kerja tempat Claude Code dijalankan |
| Run | Satu putaran kerja dari prompt sampai selesai |
| Agent | Anggota crew; satu node di grafik. "Sesi utama" = Claude yang menerima prompt |
| Status | Menunggu, Berjalan, Selesai, Dilewati, Butuh input, Gagal (selalu ikon + teks) |
| Butuh input | Claude atau agent menunggu jawaban, izin, atau keputusanmu |
| Langkah wajib | Agent yang harus jalan menurut flow; tidak jalan = Dilewati |
| Token | Setara input: perkiraan beban, bukan tagihan |
| Pemberitahuan | Judul tab, bunyi, notifikasi desktop, dan kotak di layar |
| Ringkasan run | Satu layar hasil run yang selesai |
| Riwayat | Daftar run tersimpan; run lama hanya bisa dibaca |

## 8. Asumsi dan pertanyaan terbuka

Asumsi (diputuskan di tahap ini):
- U1. Semua id elemen dan endpoint 1.7.1 tetap ada, dipindahkan ke tempat baru: `#strip` = pita indikator, `#now` = sel Siapa kerja, `#verdict` di sel itu; `#flowchip`, `#conn`, `#connt`, `#theme`, `#more`, `#pmenu`, `#reset` di bilah atas; `#tchat` = tombol ciutkan panel; `#tabs` = navigasi Live/Riwayat; `#side`, `#rz` = panel samping dan pegangan lebarnya; `#chatcard`/`#chat`, `#pg-backlog`/`#bl`/`#bcount`/`#bbar`/`#blist`/`#blempty`/`#tabbl`, `#files`/`#fcount`/`#flist`, `#pg-skill`/`#sk`/`#skcount`/`#sklist`, `#pg-token`/`#tokbox`, `#pg-log`/`#logd`/`#log`, `#results`/`#rlist` (linimasa) = isi tab panel; `#drawer`/`#dh`/`#dtabs`/`#dbody` = mode detail di panel; `#stage`, `#canvas`, `#edges`, `#zwrap`, `#zout`, `#zlbl`, `#zin`, `#zfit` = grafik; `#pg-history`/`#hist`/`#hall`/`#hcmp`/`#hback` = Riwayat; `#histbar` = bilah run lama; `#offline` = bilah terputus; id node `__prompt`, `__main`, `__all`, `__convo` tetap. Endpoint `/event`, `/reset`, `/report`, `/report.md`, `/history`, `/history/get`, `/history/delete`, `/detail`, `/stream`, `/state`, `/health`, `/quit` tetap; endpoint daftar proyek dan parameter `?p=` diputuskan arsitek.
- U2. Laci detail 1.7.1 (640 px menimpa grafik) diganti mode detail di panel samping; isinya utuh.
- U3. Kartu "Hasil per agent" tidak lagi menjadi daftar terpisah: datanya ada di kartu node, detail, dan linimasa di tab Log.
- U4. Pita indikator selalu menampilkan data live, termasuk saat melihat run lama, agar butuh input tidak terlewat.
- U5. Tombol "Ringkasan" di sel Siapa kerja dan aksi "Ringkasan" di Riwayat adalah penempatan untuk F6 ("dapat dibuka lagi"), bukan fitur baru.
- U6. Ringkasan run lama memakai data tersimpan (A11); bila sebagian tidak tersimpan, bagian itu menulis "Tidak disimpan di Riwayat."
- U7. Keyboard: node dapat difokus dengan Tab, Enter membuka detail, Esc menutup detail atau ringkasan; fokus kembali ke node asal.
- U8. Rancangan bahasa tampilan, warna, dan bentuk node (A10) milik tahap desain.

Pertanyaan terbuka (bisnis):
- Q1-Q3 = tiga persetujuan di bagian 1. Bila persetujuan 1 ditolak, T1 selalu 2 langkah; bila persetujuan 2 ditolak, ringkasan muncul tiap run selesai (sesuai teks PRD F6).

Catatan teknis untuk arsitek dan QA (bukan untuk pemilik):
- "Run selesai" = Stop sesi utama tanpa agent berjalan. Bila Claude Code mengirim Stop di tengah pekerjaan bertahap, ringkasan bisa muncul terlalu awal; perlu dicek dengan event nyata.
