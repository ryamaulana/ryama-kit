# PRD: Flow Viewer v2 (redesain UX dan UI)
Status: Locked · Versi: 1.0 · Terakhir diubah: 2026-10-27

## 1. Masalah & tujuan
Flow Viewer adalah dashboard lokal (localhost:4777) yang memantau agent Claude Code milik ryama-kit. Pemilik mengirim satu prompt lalu **memantau lewat viewer**, dan pindah ke aplikasi Claude hanya saat dimintai input. Versi sekarang gagal di tiga hal: (1) tampilan generik dan informasi di kartu agent tipis, (2) info tersebar di banyak tab sehingga tidak jelas kapan pemilik harus bertindak, (3) satu status global yang tercampur kalau dua sesi Claude Code jalan bersamaan. Tujuan v2: pemilik bisa menjawab dalam sekali lirik "siapa kerja, sampai mana, berapa token" dan **tidak pernah melewatkan** saat agent menunggu dirinya, untuk 1-3 proyek sekaligus.

## 2. User
| Peran | Kebutuhan utama | Hak akses |
|---|---|---|
| Pemilik (satu orang, laptop yang sama) | Memantau agent live, tahu kapan harus pindah ke Claude, menilai hasil dan token, membandingkan run | Penuh; tanpa login. Server hanya mengikat 127.0.0.1 |

## 3. Non-goals
- Bukan versi web/multi-user, tanpa akun, login, atau berbagi tautan.
- Viewer tidak mengendalikan Claude Code (tidak mengirim prompt, tidak menjawab pertanyaan, tidak menyetujui izin). Tetap pemantau read-only.
- Tidak ada tampilan mobile; target desktop (lebar mulai 900 px, di bawah itu boleh berupa daftar).
- Tidak ada ekspor laporan teks di v2 (ditunda ke "Nanti").
- Tidak memakai Docker atau database server; penyimpanan tetap SQLite/JSON lokal.
- Tidak ada fitur yang dihapus dari versi sekarang (Skill, Log, Backlog, Percakapan, File, Token, Riwayat, tema). Hanya penempatan dan tampilannya yang dirancang ulang.

## 4. Walkthrough
1. Pemilik menjalankan `claude` di proyek A, lalu membuka `localhost:4777`. Halaman awal menampilkan daftar proyek aktif; klik proyek A membuka tampilan proyek itu (alamat `/?p=<proyek>`), idealnya di tab/jendela sendiri.
2. Pemilik mengirim satu prompt di Claude. Workflow tampil live ala n8n: node agent tersambung garis, node aktif menyala. Tiap node berisi nama agent, status, aktivitas terakhir, cuplikan hasil, token, dan durasi.
3. Tiga indikator besar selalu terlihat: siapa yang sedang kerja, progres keseluruhan (persen), token terpakai (dengan pembanding run sebelumnya).
4. Klik satu node membuka detail lengkap (ringkasan, model, skill, tool call, file, hasil) tanpa menutup pandangan ke workflow. Bentuk penempatan ditentukan di tahap UX.
5. Agent bertanya, meminta izin, atau ada item backlog "perlu keputusan": judul tab berkedip `(1) Butuh input · <proyek>`, bunyi singkat, notifikasi desktop. Node yang menunggu ditandai dan pertanyaannya terbaca di viewer. Pemilik pindah ke aplikasi Claude, menjawab, lalu kembali.
6. Agent gagal atau error: pemberitahuan sama, node merah dengan alasan singkat.
7. Run selesai: pemberitahuan sama dan muncul ringkasan satu layar (selesai/dilewati, total token dan durasi, file berubah, keputusan tersisa).
8. Proyek B dijalankan di terminal lain: muncul sebagai tampilan terpisah, data tidak tercampur dengan proyek A.
9. Tab Riwayat menampilkan run lama proyek itu dan perbandingan token dua run. Tema terang/gelap bisa diganti kapan saja.

## 5. Fitur

### F1. Status terpisah per proyek · Prioritas: MVP
Server menyimpan status per proyek (kunci: folder kerja `cwd` dari event hook), bukan satu status global. Halaman awal `/` mendaftar proyek aktif; tiap proyek punya alamat `/?p=<nama-proyek>`. Event dari proyek A tidak pernah memengaruhi tampilan proyek B.
Acceptance criteria:
- [ ] Diberikan dua sesi di folder berbeda yang mengirim event bergantian, ketika membuka `?p=A` dan `?p=B`, maka masing-masing hanya berisi event, agent, token, dan percakapan miliknya.
- [ ] Diberikan proyek tanpa event selama 6 jam, ketika halaman awal dibuka, maka proyek itu tidak tercantum sebagai aktif (tetap bisa dibuka lewat Riwayat).
- [ ] Diberikan alamat lama tanpa `?p=` (`/`, `/state`, `/stream`), ketika dibuka, maka tetap berfungsi: `/stream` dan `/state` mengikuti proyek yang paling baru aktif.
- [ ] Judul tab memuat nama proyek.
Edge case:
- Dua sesi di folder yang sama -> satu tampilan; sesi yang paling baru aktif menjadi run saat ini, run lama disimpan ke Riwayat.
- Folder dengan nama sama di lokasi berbeda -> dibedakan dengan path singkat di daftar.
- Event tanpa `cwd` -> masuk ke proyek yang paling baru aktif.
- Server restart -> proyek aktif muncul lagi begitu ada event baru; Riwayat tetap utuh.

### F2. Workflow live bergaya n8n · Prioritas: MVP
Grafik node dan garis yang menunjukkan alur agent secara live. Tiap node berupa kartu berisi: nama agent, status, aktivitas terakhir, cuplikan hasil, token, durasi, dan model. Daftar agent dan susunan node dibentuk dari definisi agent dan `flows.json`, **bukan ditulis di kode**, sehingga agent baru yang ditambahkan ke kit muncul otomatis.
Acceptance criteria:
- [ ] Diberikan agent berstatus berjalan, ketika event baru datang, maka node-nya diperbarui dalam 1 detik tanpa memuat ulang halaman.
- [ ] Diberikan sebuah agent baru ditambahkan di folder agent proyek, ketika sesi baru dimulai, maka node-nya muncul di grafik tanpa mengubah kode viewer.
- [ ] Diberikan 12 agent, ketika grafik dirender, maka tidak ada node yang saling menimpa dan seluruh grafik bisa dilihat (zoom, pan, pas layar).
- [ ] Status node (menunggu, berjalan, selesai, dilewati, butuh input, gagal) dibedakan lewat warna **dan** ikon/teks, bukan warna saja.
Edge case:
- Belum ada run -> grafik menampilkan crew bawaan dengan status menunggu dan teks panduan singkat.
- Agent berjalan paralel -> semua tampak menyala; garis menunjukkan yang aktif.
- Agent berjalan berkali-kali -> kartu menampilkan jumlah putaran.
- Agent di luar flow terpilih -> ditandai "tidak dipakai di flow ini", tetap terlihat redup.

### F3. Tiga indikator besar · Prioritas: MVP
Selalu terlihat tanpa klik: (a) siapa yang sedang kerja dan sedang apa, (b) progres keseluruhan, (c) token yang terpakai (setara input) beserta selisih terhadap run sebelumnya.
Acceptance criteria:
- [ ] Diberikan satu atau lebih agent berjalan, maka indikator (a) menyebut nama agent dan aktivitas terakhirnya; bila tidak ada, menampilkan "tidak ada agent yang berjalan" dan status sesi utama.
- [ ] Progres (b): bila `docs/backlog.json` ada, memakai persen berbobot backlog; bila tidak, langkah flow yang sudah jalan dari total langkah wajib; bila tidak ada keduanya, menampilkan "-".
- [ ] Token (c): menampilkan setara input total; pembanding = run sebelumnya pada proyek dan flow yang sama; bila tidak ada pembanding, tidak menampilkan selisih.
- [ ] Ketiga indikator tidak tergulung keluar layar saat pemilik menggulung halaman atau membuka detail.
Edge case:
- Data token belum terbaca -> "menunggu data" (bukan 0).
- Backlog ada item ditunda (parked) -> tidak dihitung, sesuai aturan backlog.

### F4. Detail node tanpa kehilangan workflow · Prioritas: MVP
Mengklik node membuka detail lengkap (ringkasan, model terdeklarasi vs terbukti, skill dipanggil/termuat/belum terbukti, tool call, file berubah, hasil penuh). Workflow tetap terlihat saat detail terbuka. Bentuk (tab, sidebar, sidebar setengah tersembunyi, atau lainnya) diputuskan UX agent.
Acceptance criteria:
- [ ] Diberikan detail terbuka, ketika run berlanjut, maka isi detail diperbarui dan grafik tetap terlihat dan bisa dipakai.
- [ ] Diberikan detail terbuka, ketika menekan Esc atau tombol tutup, maka detail menutup dan posisi/zoom grafik tidak berubah.
- [ ] Semua isi laci detail versi sekarang tetap tersedia (tidak ada data yang hilang).
Edge case:
- Agent yang belum pernah jalan -> detail menampilkan definisi (peran, model, skill terdeklarasi), bukan kosong.

### F5. Pemberitahuan saat butuh perhatian · Prioritas: MVP
Pemicu: (1) Claude bertanya atau meminta izin, (2) item backlog berstatus perlu keputusan, (3) run selesai, (4) agent gagal atau error. Bentuk: judul tab berkedip dengan penanda dan nama proyek, bunyi singkat, dan notifikasi desktop dari browser. Node terkait ditandai dan teks pertanyaan/alasannya terlihat di viewer.
Acceptance criteria:
- [ ] Diberikan tab viewer tidak sedang terlihat, ketika Claude mengajukan pertanyaan, maka judul tab berubah menjadi `(1) Butuh input · <proyek>`, bunyi singkat diputar, dan notifikasi desktop muncul (bila izin diberikan).
- [ ] Diberikan pertanyaan sudah dijawab di aplikasi Claude, ketika event berikutnya tiba, maka penanda judul tab hilang dan node tidak lagi bertanda menunggu.
- [ ] Diberikan pemicu yang sama tidak berubah, maka pemberitahuan tidak diulang.
- [ ] Bunyi dapat dimatikan lewat satu tombol dan pilihan itu diingat; notifikasi desktop tidak diminta sampai pemilik menekan tombol aktifkan.
- [ ] Pertanyaan dan pilihan jawabannya terbaca di viewer tanpa membuka detail.
Edge case:
- Izin notifikasi ditolak -> judul tab dan bunyi tetap bekerja; ada petunjuk singkat cara mengizinkan.
- Tidak ada tab viewer yang terbuka -> tidak ada pemberitahuan (batasan browser); dicatat di petunjuk.
- Beberapa pemicu bersamaan -> judul menampilkan jumlahnya, urutan terbaru di atas.
- Browser memblokir autoplay bunyi sebelum ada interaksi -> bunyi dilewati tanpa error.

### F6. Ringkasan akhir satu layar · Prioritas: MVP
Saat run selesai, satu layar merangkum: langkah yang selesai dan dilewati, total token dan durasi (dibanding run sebelumnya), file yang berubah, dan keputusan/item yang masih menunggu pemilik.
Acceptance criteria:
- [ ] Diberikan run selesai yang memakai minimal satu agent atau mengubah file, maka ringkasan muncul otomatis dan bisa ditutup; dapat dibuka lagi dari Riwayat. Run tanya-jawab singkat (tanpa agent, tanpa file berubah) tidak memunculkannya otomatis, hanya tombol "Ringkasan".
- [ ] Langkah yang dilewati ditandai jelas dengan nama agent.
- [ ] Bila ada keputusan tersisa, ia berada di bagian paling atas ringkasan.
Edge case:
- Run berakhir karena error -> ringkasan menyebut langkah yang gagal.
- Run selesai tanpa file berubah -> bagian file menyatakan "tidak ada perubahan".

### F7. Tema terang dan gelap · Prioritas: MVP
Dipertahankan dari versi sekarang: tombol ganti, mengikuti pengaturan sistem pada kunjungan pertama, pilihan diingat.
Acceptance criteria:
- [ ] Kedua tema memenuhi kontras WCAG AA untuk teks dan status.
- [ ] Ganti tema tidak mengubah posisi, zoom, atau detail yang sedang terbuka.

### F8. Riwayat dan banding token, per proyek · Prioritas: MVP
Dipertahankan: daftar run, melihat run lama (hanya baca), banding token dua run, hapus. Default menampilkan proyek saat ini, ada opsi semua proyek.
Acceptance criteria:
- [ ] Semua perilaku Riwayat versi 1.7.1 tetap berfungsi.
- [ ] Run dari proyek A tidak tampil di Riwayat proyek B kecuali opsi "semua proyek" dipilih.
Edge case:
- Dua run berbeda flow dibandingkan -> ada peringatan bahwa perbandingan mungkin tidak setara.

### F9. Fitur yang dipertahankan · Prioritas: MVP
Skill (sedang/terakhir dipanggil dan yang belum terbukti), Log kejadian, Backlog (persen, grup, item perlu keputusan), Percakapan (cermin), File yang diubah, Reset run (dua langkah konfirmasi). Penempatan di layar dirancang ulang oleh UX agent; datanya tidak berkurang.
Acceptance criteria:
- [ ] Setiap data di versi 1.7.1 masih dapat dijangkau dari layar dalam maksimal dua klik.

### F10. Ekspor laporan teks · Prioritas: Nanti
Laporan markdown siap salin dari ringkasan akhir.

## 6. Layar
| Layar | Tujuan | Fitur terkait | Wireframe |
|---|---|---|---|
| Daftar proyek (`/`) | Memilih proyek aktif | F1 | Dirancang di tahap UX |
| Tampilan proyek (live) | Workflow, tiga indikator, pemberitahuan | F2, F3, F5 | Dirancang di tahap UX |
| Detail node | Rincian satu agent | F4 | Dirancang di tahap UX; bentuk penempatan diputuskan UX |
| Ringkasan akhir | Hasil satu layar | F6 | Dirancang di tahap UX |
| Riwayat | Run lama dan banding | F8 | Dirancang di tahap UX |
| Skill, Backlog, Log, Percakapan, File | Data pendukung | F9 | Penempatan diputuskan UX |

## 7. Data model
| Entitas | Field penting | Relasi | Catatan |
|---|---|---|---|
| Project | kunci (path folder), nama, lastEventAt | punya banyak Run | Aktif bila ada event dalam 6 jam |
| Run | id, project, flow, prompt, startedAt, updatedAt, finished, token, state, percakapan | milik satu Project | Disimpan di SQLite/JSON (sudah ada) |
| Agent (definisi) | id, nama tampil, peran, fase/kolom, model, skill | dibaca dari folder agent proyek dan `flows.json` | Bukan hard-code; agent baru muncul otomatis |
| Attention item | jenis (pertanyaan, izin, keputusan, error, selesai), run, agent, teks, waktu, resolvedAt | milik satu Run | Dihitung dari event; tidak perlu disimpan permanen |
| Pengaturan tampilan | tema, bunyi aktif, izin notifikasi, zoom | per browser | `localStorage`; tidak penting untuk fungsi |

## 8. Constraint teknis
- Stack: tetap Node tanpa dependensi baru (kecuali `node:sqlite` bawaan yang sudah dipakai) dan HTML/JS vanilla; boleh dipecah menjadi beberapa file statis. Satu server, port 4777, hanya 127.0.0.1.
- Deploy: plugin Claude Code `flow-viewer` di ryama-kit, dimuat langsung dari `D:\01_Workspace\ryama-kit\plugins\flow-viewer`; server dinyalakan oleh hook SessionStart.
- Integrasi: event hook Claude Code (PreToolUse, PostToolUse, SubagentStart/Stop, UserPromptSubmit, Notification, Stop), transkrip agent, `docs/backlog.json` proyek.
- Batasan: Bahasa UI: id. Sistem Windows/PowerShell. Pembaruan dalam 1 detik. Mendukung sampai 12 agent per proyek dan 3 proyek aktif. Kompatibilitas: jangan memutus id elemen dan endpoint yang dipakai skrip tes yang ada tanpa menggantinya.
- Privasi: seluruh data (prompt, jawaban, token) tetap lokal; file riwayat jangan ikut ter-commit.

## 9. Assumptions
> Diisi tanpa konfirmasi eksplisit kecuali ditandai. Pemilik wajib membaca bagian ini.
- A1. "Satu jendela per proyek" = satu server dan satu port, tiap proyek punya alamat `?p=` dan dibuka di tab/jendela sendiri. Dikonfirmasi pemilik.
- A2. "Butuh keputusan" bukan indikator besar; ditangani lewat pemberitahuan dan penandaan node. Dikonfirmasi pemilik.
- A3. Notifikasi desktop memerlukan izin browser satu kali dan hanya bekerja bila minimal satu tab viewer terbuka. Dikonfirmasi pemilik.
- A4. Wireframe dan penempatan panel detail dirancang UX agent, bukan di PRD. Dikonfirmasi pemilik.
- A5. Kunci proyek = folder kerja (`cwd`). Dua sesi di folder yang sama berbagi satu tampilan.
- A6. Proyek dianggap aktif bila ada event dalam 6 jam terakhir.
- A7. Bunyi pemberitahuan aktif secara default dengan tombol senyap; notifikasi desktop baru diminta saat pemilik mengaktifkannya.
- A8. Pembanding token = run sebelumnya pada proyek dan flow yang sama.
- A9. Agent baru dikenali dari definisi agent proyek dan `flows.json` (bukan dari daftar di kode).
- A10. Arah visual: gabungan kartu bergaya OrchestrateIQ dengan node bergaya n8n, tampak live, dengan kontras lebih kuat dan isi kartu berupa data nyata; bukan klon referensi. Dipilih pemilik.
- A11. Riwayat hanya menyimpan ringkasan run dan percakapan (bukan output tool lengkap), seperti versi 1.7.1.

## 10. Open Questions
- [ ] Q1. Bentuk penempatan detail node dan Backlog/Skill/Log (tab, sidebar, sidebar setengah tersembunyi) dan susunan tiga indikator besar. (memblokir MVP: tidak; diputuskan di tahap UX)

## 11. Decision Log
| Tanggal | Versi | Perubahan | Alasan |
|---|---|---|---|
| 2026-10-27 | 1.0 | PRD dibuat dan dikunci | Wawancara tiga putaran dengan pemilik; review skeptis: 14 celah, semua diselesaikan lewat asumsi A5-A11 atau diserahkan ke UX (Q1) |
| 2026-10-27 | 1.1 | F6: ringkasan otomatis hanya untuk run dengan agent atau file berubah; run singkat cukup tombol "Ringkasan" | Disetujui pemilik saat persetujuan UX |
