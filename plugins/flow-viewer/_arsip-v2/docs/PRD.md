# PRD: Flow Viewer v2 (redesain UX dan UI)
Status: Locked · Versi: 1.2 · Terakhir diubah: 2026-11-03

Istilah mengikuti `GLOSSARY.md` (folder plugin). Definisi yang mengikat PRD ini ada di bagian 4a.

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
- Tidak ada ekspor laporan teks di v2 (ditunda ke "Nanti", F10). Laporan token (F12) bukan ekspor ini: ia dibaca di viewer, dan salinan markdown-nya untuk AI ditulis otomatis.
- Tidak memakai Docker atau database server; penyimpanan tetap SQLite/JSON lokal.
- Tidak ada fitur yang dihapus dari versi sekarang (Skill, Log, Backlog, Percakapan, File, Token, Riwayat, tema). Hanya penempatan dan tampilannya yang dirancang ulang.

## 4. Walkthrough
1. Pemilik menjalankan `claude` di proyek A, lalu membuka `localhost:4777`. Halaman awal menampilkan daftar proyek aktif; klik proyek A membuka tampilan proyek itu (alamat `/?p=<proyek>`), idealnya di tab/jendela sendiri.
2. Pemilik mengirim satu prompt di Claude. Workflow tampil live ala n8n: node agent tersambung garis, node aktif menyala. Tiap node berisi nama agent, status, aktivitas terakhir, cuplikan hasil, token, dan durasi.
3. Tiga indikator besar selalu terlihat: siapa yang sedang kerja, progres keseluruhan (persen), token terpakai (dengan pembanding run sebelumnya).
4. Klik satu node membuka detail lengkap (ringkasan, model, skill, tool call, file, hasil) tanpa menutup pandangan ke workflow. Bentuk penempatan ditentukan di tahap UX.
5. Claude atau agent bertanya lewat AskUserQuestion, meminta izin, Claude Code mengirim event Notification, atau ada item backlog "perlu keputusan": judul tab berkedip `(1) Butuh input · <proyek>`, bunyi singkat, notifikasi desktop. Node yang menunggu ditandai dan pertanyaannya terbaca di viewer. Pemilik pindah ke aplikasi Claude, menjawab, lalu kembali.
6. Agent gagal atau error: pemberitahuan sama, node merah dengan alasan singkat.
7. Run selesai: pemberitahuan sama dan muncul ringkasan satu layar (selesai/dilewati, total token dan durasi, file berubah, keputusan tersisa).
8. Proyek B dijalankan di terminal lain: muncul sebagai tampilan terpisah, data tidak tercampur dengan proyek A.
9. Pemilik membuka panel Backlog: baris paling atas menjawab "bagian mana yang macet dan apa berikutnya", lalu item dikelompokkan per bagian produk (mis. Live, Riwayat, Pemberitahuan), bukan per jenis teknis.
10. Tab Riwayat menampilkan run lama proyek itu, perbandingan token dua run, dan tombol Laporan token yang membuka laporan proyek yang sedang ditampilkan. Tema terang/gelap bisa diganti kapan saja.

## 4a. Definisi yang mengikat
Sumber keputusan: `docs/adr/0001-batas-run.md`, `docs/adr/0002-proyek-diikat-sesi.md`, `docs/KEPUTUSAN.md`. Istilah lain: `GLOSSARY.md`.
- **Proyek**: folder tempat sesi Claude Code dimulai. Sesi diikat ke proyek pada event pertamanya (`session_id`); event berikutnya dari sesi itu tetap milik proyek tersebut walau `cwd` berpindah ke subfolder (ADR 0002). Sesi yang belum terikat (mis. setelah server restart) diikat ke proyek yang sudah dikenal bila `cwd`-nya di dalam folder proyek itu; selain itu `cwd` menjadi proyek baru. Sesi yang memang dimulai di subfolder menjadi proyek sendiri.
- **Run** (ADR 0001): satu putaran kerja. Run baru dimulai oleh (1) perintah flow, (2) sesi baru di folder proyek yang sama, atau (3) prompt pemilik setelah run berfase Selesai. Pesan sistem yang disuntik (mis. agent latar selesai) dan prompt saat run Jeda melanjutkan run yang sama.
- **Akhir run** (ADR 0001): event Stop sesi utama menjadi kandidat akhir hanya bila tidak ada agent berjalan dan `background_tasks` kosong. Setelah 2 detik tanpa event, run digolongkan: **Gagal** (ada kegagalan yang belum diulang), **Jeda** (flow masih punya langkah wajib yang belum jalan, atau pesan terakhir berakhir `?`), atau **Selesai**. Jeda bukan Selesai: Ringkasan run tidak muncul dan pemberitahuan Selesai tidak dikirim.
- **Token setara input** ("setara"): `input + 1,25 x cache tulis + 0,1 x cache baca + 5 x output`, bobot harga yang sama untuk semua model; rumus yang sama dipakai Laporan token (F12). Perkiraan beban, bukan tagihan.
- **Selisih token**: `round((setara run ini - setara pembanding) / setara pembanding x 100)` dalam persen, ditampilkan dengan tanda (`+12%`, `-8%`).
- **Pembanding**: run terbaru di proyek dan flow yang sama, dengan setara > 0; untuk run tanpa flow, sama-sama memakai agent atau sama-sama tidak.
- **Model/skill terdeklarasi vs terbukti**: terdeklarasi = tertulis di definisi agent (frontmatter); terbukti = terlihat dipakai di transkrip/event run ini. Istilah ini wajib dimuat di `GLOSSARY.md`.
- **Agent diam**: agent berstatus Berjalan tanpa event baru selama lebih dari **10 menit**.
- **Token boros**: setara sebuah run (berjalan atau tersimpan) lebih dari **150%** setara pembanding (selisih > +50%).
- **Identitas pemicu**: satu pemberitahuan = satu kunci `jenis + sumber + kejadian` (jenis: pertanyaan, izin, keputusan, gagal, selesai; sumber: agent atau sesi utama, atau id item backlog; kejadian: id panggilan tool, atau nomor urut di run). Kunci yang sama tidak pernah dibunyikan atau dinotifikasi dua kali, termasuk setelah halaman dimuat ulang dan di dua tab proyek yang sama.

## 5. Fitur

### F1. Status terpisah per proyek · Prioritas: MVP
Server menyimpan status per proyek (Proyek sesuai 4a: folder awal sesi, diikat lewat `session_id`), bukan satu status global. Halaman awal `/` mendaftar proyek aktif; tiap proyek punya alamat `/?p=<nama-proyek>`. Event dari proyek A tidak pernah memengaruhi tampilan proyek B.
Acceptance criteria:
- [ ] Diberikan dua sesi di folder berbeda yang mengirim event bergantian, ketika membuka `?p=A` dan `?p=B`, maka masing-masing hanya berisi event, agent, token, dan percakapan miliknya.
- [ ] Diberikan sesi yang dimulai di folder A lalu mengirim event dengan `cwd` di `A\docs\mockups`, ketika daftar proyek dibuka, maka hanya ada proyek A dan event subfolder itu tampil di `?p=A`.
- [ ] Diberikan server baru restart dan sesi lama di `A\docs` mengirim event, ketika A sudah ada di Riwayat, maka event masuk ke proyek A, bukan proyek baru `docs`.
- [ ] Diberikan proyek tanpa event selama 6 jam, ketika halaman awal dibuka, maka proyek itu tidak tercantum sebagai aktif, tetapi tercantum di bagian "Proyek tidak aktif" dan bisa dibuka.
- [ ] Diberikan proyek tidak aktif dibuka dari `/`, maka tampilan menunjukkan run terakhirnya (hanya baca) dengan label "Tidak aktif sejak <waktu>" dan Riwayat proyek itu; tampilan berpindah ke live begitu proyek itu mengirim event baru.
- [ ] Diberikan tab terbuka di `?p=A`, ketika proyek B menjadi lebih baru aktif, maka tab itu tetap menampilkan A (tidak pernah melompat).
- [ ] Diberikan alamat lama tanpa `?p=` (`/`, `/state`, `/stream`), ketika dibuka, maka tetap berfungsi: `/stream` dan `/state` mengikuti proyek yang paling baru aktif; `/` dengan tepat satu proyek aktif langsung membuka `?p=<proyek>` sehingga tab itu tidak ikut melompat.
- [ ] Judul tab memuat nama proyek.
Edge case:
- Dua sesi di folder yang sama -> satu tampilan; sesi yang paling baru aktif menjadi run saat ini, run lama disimpan ke Riwayat. Pertanyaan dan izin dari sesi lama tetap memicu pemberitahuan.
- Folder dengan nama sama di lokasi berbeda -> dibedakan dengan path singkat di daftar.
- Event tanpa `cwd` dan tanpa ikatan sesi -> masuk ke proyek yang paling baru aktif.
- Server restart -> proyek aktif muncul lagi begitu ada event baru; Riwayat tetap utuh.
- `?p=` tidak dikenal -> "Proyek ini belum punya kejadian." dengan tautan ke Daftar proyek dan Riwayat; tampilan muncul otomatis bila proyek itu mulai mengirim event.

### F2. Workflow live bergaya n8n · Prioritas: MVP
Grafik node dan garis yang menunjukkan alur agent secara live. Tiap node berupa kartu berisi: nama agent, status, aktivitas terakhir, cuplikan hasil, token, durasi, dan model. Daftar agent dan susunan node dibentuk dari definisi agent dan `flows.json`, **bukan ditulis di kode**, sehingga agent baru yang ditambahkan ke kit muncul otomatis.
Acceptance criteria:
- [ ] Diberikan agent berstatus berjalan, ketika event baru datang, maka node-nya diperbarui dalam 1 detik tanpa memuat ulang halaman.
- [ ] Diberikan sebuah agent baru ditambahkan di folder agent proyek, ketika sesi baru dimulai, maka node-nya muncul di grafik tanpa mengubah kode viewer.
- [ ] Diberikan 12 agent, ketika grafik dirender, maka tidak ada node yang saling menimpa dan seluruh grafik bisa dilihat (zoom, pan, pas layar).
- [ ] Diberikan lebih dari 12 agent (uji: 20), ketika grafik dirender, maka tetap tidak ada node yang saling menimpa dan "pas layar" memuat semuanya; target pembaruan 1 detik hanya dijamin sampai 12 agent.
- [ ] Status node (menunggu, berjalan, selesai, dilewati, butuh input, gagal) dibedakan lewat warna **dan** ikon/teks, bukan warna saja.
- [ ] Diberikan agent berjalan tanpa event lebih dari 10 menit (Agent diam, 4a), maka node-nya diberi penanda "Diam <n> mnt" (ikon dan teks), tanpa mengubah statusnya.
Sumber definisi agent, urutan menang bila nama sama: (1) `<proyek>/.claude/agents/*.md`, (2) `~/.claude/agents/*.md`, (3) `plugins/*/agents/*.md` milik ryama-kit. Crew yang tampil sejak awal = agent dari (1) dan (3) ditambah node flow; agent dari (2) hanya tampil bila jalan, bertanda "di luar flow".
Edge case:
- Belum ada run -> grafik menampilkan crew bawaan dengan status menunggu dan teks panduan singkat.
- Agent berjalan paralel -> semua tampak menyala; garis menunjukkan yang aktif.
- Agent berjalan berkali-kali -> kartu menampilkan jumlah putaran.
- Agent di luar flow terpilih -> ditandai "tidak dipakai di flow ini", tetap terlihat redup.

### F3. Tiga indikator besar · Prioritas: MVP
Selalu terlihat tanpa klik: (a) siapa yang sedang kerja dan sedang apa, (b) progres keseluruhan, (c) token yang terpakai (setara input, 4a) beserta selisih persen terhadap pembanding (4a).
Acceptance criteria:
- [ ] Diberikan satu atau lebih agent berjalan, maka indikator (a) menyebut nama agent dan aktivitas terakhirnya; bila tidak ada, menampilkan "tidak ada agent yang berjalan" dan status sesi utama.
- [ ] Progres (b): bila `docs/backlog.json` ada, memakai persen berbobot backlog; bila tidak, langkah flow yang sudah jalan dari total langkah wajib; bila tidak ada keduanya, menampilkan "-".
- [ ] Token (c): menampilkan setara input total dengan rumus 4a; selisih dalam persen terhadap pembanding (4a); bila tidak ada pembanding, tidak menampilkan selisih.
- [ ] Diberikan setara run berjalan > 150% pembanding (Token boros, 4a), maka indikator (c) ditandai "Boros" dengan ikon dan teks, tanpa pemberitahuan bunyi atau desktop.
- [ ] Diberikan ada agent diam (4a), maka indikator (a) menyebutnya ("<agent> diam 12 mnt").
- [ ] Ketiga indikator tidak tergulung keluar layar saat pemilik menggulung halaman atau membuka detail.
Edge case:
- Data token belum terbaca -> "menunggu data" (bukan 0).
- Pembanding dihapus dari Riwayat saat run berjalan -> selisih dan tanda Boros tidak ditampilkan untuk run itu.
- Backlog ada item ditunda (parked) -> tidak dihitung, sesuai aturan backlog.

### F4. Detail node tanpa kehilangan workflow · Prioritas: MVP
Mengklik node membuka detail lengkap (ringkasan, model terdeklarasi vs terbukti (4a), skill dipanggil/termuat/belum terbukti, tool call, file berubah, hasil penuh). Workflow tetap terlihat saat detail terbuka. Bentuk (tab, sidebar, sidebar setengah tersembunyi, atau lainnya) diputuskan UX agent.
Pertanyaan utama detail: "Apa yang dikerjakan agent ini, apa hasilnya, dan apakah ada yang salah?" Keputusan dari jawabannya: biarkan, minta ulang lewat Claude, atau periksa file yang diubah.
Keluhan pemilik (v1.2): "secara ui principle kurang di bagian detail". Detail harus punya hierarki yang jelas: jawaban pertanyaan utama di atas, rincian di bawah, bukan tumpukan data yang sama beratnya.
Acceptance criteria:
- [ ] Diberikan detail terbuka, ketika run berlanjut, maka isi detail diperbarui dan grafik tetap terlihat dan bisa dipakai.
- [ ] Diberikan detail terbuka, ketika menekan Esc atau tombol tutup, maka detail menutup dan posisi/zoom grafik tidak berubah.
- [ ] Semua isi laci detail versi sekarang tetap tersedia (tidak ada data yang hilang).
- [ ] Diberikan detail agent terbuka di 1440 x 900, maka tanpa menggulung terlihat: nama agent, status (ikon dan teks), satu kalimat jawaban (hasil terakhir, alasan gagal, atau pertanyaan yang menunggu), dan tiga angka (durasi, token setara, jumlah putaran).
- [ ] Diberikan agent bermasalah (Gagal, Butuh input, Agent diam, model terbukti berbeda dari terdeklarasi, atau skill terdeklarasi belum terbukti), maka masalah itu tampil sebagai peringatan di bagian atas detail dengan teks penyebabnya, bukan hanya di dalam tab atau bagian bawah.
- [ ] Diberikan bagian rincian tanpa data (mis. tidak ada file berubah), maka bagian itu tampil sebagai satu baris keterangan ("Tidak ada file berubah"), bukan kotak kosong atau judul tanpa isi.
- [ ] Diberikan hasil agent lebih panjang dari 12 baris, maka hanya cuplikan yang tampil dengan tombol "Tampilkan semua"; teks lengkap tetap tersedia.
- [ ] Rincian dikelompokkan dalam urutan tetap yang sama untuk semua agent (urutan ditetapkan UX), dengan judul bagian berbahasa biasa, bukan nama field teknis.
- [ ] Diberikan review `ui-critic` dengan skill `design-principles` pada screenshot detail (agent berjalan, selesai, gagal, belum pernah jalan), maka tidak ada temuan berbobot tinggi soal hierarki, pengelompokan, atau keterbacaan.
Edge case:
- Agent yang belum pernah jalan -> detail menampilkan definisi (peran, model, skill terdeklarasi), bukan kosong.
- Agent jalan berkali-kali -> angka di atas untuk putaran terakhir, dengan total semua putaran di sebelahnya.

### F5. Pemberitahuan saat butuh perhatian · Prioritas: MVP
Pemicu: (1) Butuh input, **hanya** dari tiga sinyal: tool AskUserQuestion dipanggil (teks dan pilihan), permintaan izin (PermissionRequest atau Notification bertipe izin), dan event `Notification` dari Claude Code yang menyatakan Claude menunggu; (2) item backlog berstatus perlu keputusan; (3) run Selesai (4a); (4) agent gagal atau error. Pesan teks biasa yang berakhir `?` tidak memicu pemberitahuan (hanya membuat run Jeda, 4a). Bentuk: judul tab berkedip dengan penanda dan nama proyek, bunyi singkat, dan notifikasi desktop dari browser. Node terkait ditandai dan teks pertanyaan/alasannya terlihat di viewer.
Acceptance criteria:
- [ ] Diberikan tab viewer tidak sedang terlihat, ketika Claude memanggil AskUserQuestion, maka judul tab berubah menjadi `(1) Butuh input · <proyek>`, bunyi singkat diputar, dan notifikasi desktop muncul (bila izin diberikan).
- [ ] Diberikan Claude meminta izin memakai alat, atau Claude Code mengirim event Notification bahwa Claude menunggu, maka pemberitahuan Butuh input yang sama muncul.
- [ ] Diberikan pesan terakhir Claude berakhir `?` tanpa AskUserQuestion, izin, atau Notification, maka tidak ada bunyi, notifikasi desktop, atau penanda judul tab; run tampil Jeda.
- [ ] Diberikan run sudah diberitahukan Selesai, ketika Notification "menunggu input" berkala datang setelahnya, maka tidak ada pemberitahuan baru.
- [ ] Diberikan pertanyaan sudah dijawab di aplikasi Claude, ketika event berikutnya tiba, maka penanda judul tab hilang dan node tidak lagi bertanda menunggu.
- [ ] Diberikan pemicu dengan identitas yang sama (4a), maka pemberitahuan tidak diulang, termasuk setelah halaman dimuat ulang; dua tab proyek yang sama menghasilkan satu notifikasi desktop.
- [ ] Angka di judul tab `?p=A` hanya menghitung pemberitahuan proyek A yang belum selesai.
- [ ] Diberikan tab `?p=A` terbuka dan proyek B memicu Butuh input atau Gagal, maka pengalih proyek di tab A menampilkan penanda pada B, notifikasi desktop bernama proyek B muncul satu kali (bila izin diberikan), tanpa bunyi dan tanpa mengubah angka judul tab A.
- [ ] Bunyi dapat dimatikan lewat satu tombol dan pilihan itu diingat; notifikasi desktop tidak diminta sampai pemilik menekan tombol aktifkan.
- [ ] Pertanyaan dan pilihan jawabannya terbaca di viewer tanpa membuka detail.
Edge case:
- Izin notifikasi ditolak -> judul tab dan bunyi tetap bekerja; ada petunjuk singkat cara mengizinkan.
- Tidak ada tab viewer yang terbuka -> tidak ada pemberitahuan (batasan browser); dicatat di petunjuk.
- Beberapa pemicu bersamaan -> judul menampilkan jumlahnya, urutan terbaru di atas.
- Browser memblokir autoplay bunyi sebelum ada interaksi -> bunyi dilewati tanpa error.
- Pertanyaan teks biasa (tanpa AskUserQuestion) -> baru diberitahukan saat Claude Code mengirim Notification menunggu (biasanya sekitar 60 detik setelah Claude berhenti); keterlambatan ini diterima (A12).

### F6. Ringkasan akhir satu layar · Prioritas: MVP
Saat run Selesai atau Gagal (4a; bukan Jeda), satu layar merangkum: langkah yang selesai dan dilewati, total token dan durasi (dibanding run sebelumnya), file yang berubah, dan keputusan/item yang masih menunggu pemilik.
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
Pertanyaan utama Riwayat: "Apakah run ini lebih boros atau lebih lama dari sebelumnya, dan di mana bedanya?" Keputusan dari jawabannya: telusuri agent atau item yang boros (lewat Laporan token, F12), atau hapus run yang tidak berguna.
Daftar perilaku resmi (menggantikan "semua perilaku 1.7.1"; endpoint dan selector pendukungnya dipetakan di `docs/ARCHITECTURE.md` §10):
1. Daftar run proyek ini, terbaru di atas, maks 60 baris: judul atau prompt, waktu mulai (jam dan "x lalu"), token setara, durasi, penanda "sedang berjalan".
2. Tombol "Semua proyek" / "Hanya proyek ini"; mode semua proyek mengelompokkan baris per proyek dengan nama proyek di kepala grup.
3. "Buka" run lama: tata letak Live, hanya baca, dengan tombol kembali ke live; run yang sedang berjalan membuka tampilan live ("Lihat live").
4. Centang dua run -> perbandingan token setara, durasi, agent yang jalan, dan file berubah, dengan selisih persen (4a).
5. "Analisis ulang" per run: menghitung token per pemanggilan agent dari transkrip, dengan status hasil di tombol.
6. Hapus run (lihat AC hapus di bawah).
7. Ringkasan run lama bisa dibuka lagi (F6).
8. Laporan token proyek (F12).
Acceptance criteria:
- [ ] Setiap perilaku 1-8 di daftar resmi berfungsi.
- [ ] Run dari proyek A tidak tampil di Riwayat proyek B kecuali opsi "semua proyek" dipilih.
- [ ] Diberikan run yang tidak sedang berjalan, ketika pemilik menekan Hapus lalu mengonfirmasi satu kali, maka run hilang dari daftar dan dari penyimpanan.
- [ ] Diberikan run yang sedang berjalan (di proyek mana pun), maka tombol Hapus tidak tersedia dan alasannya tertulis ("Run sedang berjalan"); permintaan hapus langsung ke server ditolak.
- [ ] Diberikan proyek dengan lebih dari 200 run tersimpan, ketika run baru disimpan, maka run tertua proyek itu dihapus otomatis; run proyek lain tidak tersentuh.
- [ ] Diberikan baris Riwayat dengan setara > 150% pembandingnya (Token boros, 4a), maka baris itu bertanda "Boros" dengan ikon dan teks.
Edge case:
- Dua run berbeda flow dibandingkan -> ada peringatan bahwa perbandingan mungkin tidak setara.
- Riwayat kosong -> "Belum ada run tersimpan." dengan penjelasan kapan run disimpan.
- Baris lama tanpa field baru -> field itu ditampilkan "Tidak disimpan di Riwayat."

### F9. Fitur yang dipertahankan · Prioritas: MVP
Skill (sedang/terakhir dipanggil dan yang belum terbukti), Log kejadian, Backlog (dirancang ulang di F11), Percakapan (cermin), File yang diubah, Reset run (dua langkah konfirmasi). Penempatan di layar dirancang ulang oleh UX agent; datanya tidak berkurang.
Acceptance criteria:
- [ ] Setiap data di versi 1.7.1 masih dapat dijangkau dari layar dalam maksimal dua klik.

### F10. Ekspor laporan teks · Prioritas: Nanti
Laporan markdown siap salin dari ringkasan akhir. Berbeda dari Laporan token (F12), yang MVP.

### F11. Backlog terbaca per bagian · Prioritas: MVP
Keluhan pemilik (v1.2): "backlog campur aduk bngt, kek gatau ini bagian apa apa apa". Panel Backlog sekarang mengelompokkan per jenis teknis (fe, be, ui, qa), sehingga pemilik tidak tahu bagian produk mana yang sedang dikerjakan.
Pertanyaan utama: "Bagian mana yang macet atau menunggu saya, dan apa berikutnya?" Keputusan dari jawabannya: menjawab keputusan di Claude, menyuruh run lanjut, atau mengubah prioritas.
**Bagian** = irisan tugas item (`slice` di `docs/backlog.json`); nama ditampilkan dalam bentuk biasa (`detail-node` -> "Detail node"). Item tanpa irisan masuk bagian "Tanpa bagian".
**Keadaan bagian**, urut prioritas: Butuh keputusan (ada item keputusan siap) > Macet (ada item gagal, atau masih ada item belum selesai tetapi tidak ada yang siap atau berjalan) > Berjalan > Belum mulai > Selesai.
Acceptance criteria:
- [ ] Diberikan backlog dengan field irisan, ketika panel Backlog dibuka, maka item dikelompokkan per bagian, bukan per jenis teknis; jenis teknis tampil hanya sebagai label kecil berkata biasa (Tampilan, Penyambungan, Server, Uji, Keamanan, Review, Keputusan).
- [ ] Baris paling atas panel menjawab pertanyaan utama dalam satu baris: "<n> bagian macet · <m> keputusan menunggu kamu · Berikutnya: <judul item siap teratas>" (bagian yang nol tidak ditulis; tanpa item siap: "Tidak ada item siap").
- [ ] Tiap judul bagian memuat nama bagian, keadaan bagian (ikon dan teks), dan "<selesai> dari <total> item" (item diparkir dan ditolak tidak dihitung).
- [ ] Bagian diurutkan menurut keadaan (Butuh keputusan, Macet, Berjalan, Belum mulai, Selesai); bagian Selesai terlipat secara bawaan.
- [ ] Di dalam bagian, item diurutkan: keputusan, gagal, berjalan, siap, menunggu dependensi, selesai.
- [ ] Item keputusan menampilkan pertanyaan bisnisnya; item gagal menampilkan alasannya; item menunggu menampilkan nama item yang ditunggu.
- [ ] Item diparkir tampil di grup "Diparkir" terlipat paling bawah, tidak dihitung di persen mana pun.
- [ ] Persen keseluruhan tetap sama dengan indikator progres (b) di F3.
Edge case:
- Proyek tanpa `docs/backlog.json` -> "Proyek ini belum punya backlog." tanpa angka.
- Backlog lama tanpa field irisan sama sekali -> dikelompokkan per jenis teknis dengan label berkata biasa, dan baris atas menyebut "Backlog ini belum dibagi per bagian".
- Satu bagian berisi lebih dari 20 item -> item selesai di bagian itu terlipat menjadi satu baris "<n> item selesai".
- `docs/backlog.json` rusak atau lebih dari 2 MB -> "Backlog tidak bisa dibaca" dengan alasannya; panel lain tetap jalan.

### F12. Laporan token proyek · Prioritas: MVP
Tombol "Laporan" di Riwayat membuka laporan token **satu proyek** dari run tersimpannya (ringkasan, per run, per agent, pemanggilan termahal, sesi utama), memakai rumus setara 4a. Salinan markdown yang sama ditulis ke `<proyek>/.flow-viewer/laporan-token.md` (folder itu meng-ignore dirinya sendiri) agar bisa dibaca AI.
Pertanyaan utama: "Agent, item, atau kebiasaan mana yang paling boros token di proyek ini?" Keputusan: mengubah model atau ukuran item backlog, atau memecah item.
Bug yang dilaporkan pemilik (v1.2): tombol Laporan di Riwayat. Di versi berjalan tombol ini muncul di **setiap baris run** tetapi melaporkan seluruh proyek, berlabel hanya "Laporan", dan bila proyek baris kosong diam-diam memakai folder kerja terakhir server (bisa proyek lain). Kriteria di bawah adalah perilaku benar; gejala persis yang dilihat pemilik dicatat di Q2.
Acceptance criteria:
- [ ] Riwayat menampilkan satu tombol "Laporan token" per proyek (di kepala panel untuk mode proyek ini; di kepala tiap grup proyek untuk mode semua proyek), bukan satu per baris run.
- [ ] Diberikan tombol ditekan di Riwayat proyek A, maka laporan yang terbuka berjudul nama proyek A dan hanya memuat run proyek A, walau proyek lain lebih baru aktif.
- [ ] Diberikan laporan sedang dimuat, maka tampil "Menyusun laporan..." dan tombol tidak bisa ditekan dua kali; diberikan gagal, maka tampil pesan galat dengan tombol "Coba lagi", bukan teks galat mentah server.
- [ ] Diberikan proyek tanpa run tersimpan, maka tombol tidak tersedia dengan keterangan "Belum ada run untuk dilaporkan".
- [ ] Laporan terbuka di atas Riwayat dan menutup lewat Esc, tombol Tutup, atau klik di luar; setelah ditutup, posisi gulir dan centang perbandingan Riwayat tidak berubah.
- [ ] Bagian paling atas laporan menjawab pertanyaan utama: tiga penyumbang setara terbesar (agent atau item) dengan persennya, sebelum tabel rinci.
- [ ] Teks dari run (judul, prompt, nama item) tampil sebagai teks biasa; tidak ada HTML dari isi run yang dijalankan.
- [ ] Diberikan ada run yang belum dianalisis per pemanggilan, maka laporan menyebut jumlahnya dan cara menjalankan "Analisis ulang".
Edge case:
- Folder proyek sudah tidak ada atau tidak bisa ditulis -> laporan tetap tampil di viewer; file salinan dilewati tanpa galat.
- Proyek dengan lebih dari 200 run -> laporan memakai maks 200 run terbaru dan menyebut batas itu.

## 6. Layar
Satu peran (Pemilik). Tiap layar atau panel punya satu pertanyaan utama; "keadaan masalah" adalah yang harus menonjol tanpa dicari.

| Layar | Jenis (tugas / dashboard / pemasaran) | Pertanyaan utama | Keputusan dari jawabannya | Keadaan masalah | Fitur terkait | Wireframe |
|---|---|---|---|---|---|---|
| Daftar proyek (`/`) | dashboard | Proyek mana yang butuh saya sekarang? | Buka proyek mana | Proyek Butuh input atau Gagal (paling atas) | F1 | Dirancang di tahap UX |
| Live (tampilan proyek) | dashboard | Apakah saya perlu pindah ke Claude sekarang, dan bila tidak, apakah kerja berjalan normal? | Pindah ke Claude, biarkan, atau buka detail agent bermasalah | Butuh input, Gagal, Agent diam > 10 mnt, Token boros > 150% pembanding | F2, F3, F5 | Dirancang di tahap UX |
| Detail agent (detail node) | dashboard | Apa yang dikerjakan agent ini, apa hasilnya, dan apakah ada yang salah? | Biarkan, minta ulang lewat Claude, atau periksa file | Gagal, Butuh input, diam, model/skill terbukti tidak cocok dengan terdeklarasi | F4 | Dirancang di tahap UX; bentuk penempatan diputuskan UX |
| Backlog (panel) | dashboard | Bagian mana yang macet atau menunggu saya, dan apa berikutnya? | Jawab keputusan, suruh lanjut, atau ubah prioritas | Bagian Butuh keputusan atau Macet; item gagal | F11, F3 | Penempatan diputuskan UX |
| Riwayat | dashboard | Apakah run ini lebih boros atau lebih lama dari sebelumnya, dan di mana bedanya? | Telusuri lewat Laporan token, atau hapus run tak berguna | Run bertanda Boros | F8 | Dirancang di tahap UX |
| Laporan token (di atas Riwayat) | dashboard | Agent, item, atau kebiasaan mana yang paling boros token di proyek ini? | Ubah model/ukuran item, pecah item | Tiga penyumbang setara terbesar | F12 | Dirancang di tahap UX |
| Ringkasan akhir | dashboard | Apa yang tersisa untuk saya setelah run ini? | Jawab keputusan tersisa, periksa langkah gagal/dilewati | Keputusan tersisa, langkah Gagal atau Dilewati | F6 | Dirancang di tahap UX |
| Skill, Log, Percakapan, File (panel) | dashboard (panel pendukung) | Skill: skill mana yang belum terbukti dipakai? Log: apa yang baru terjadi? Percakapan: apa yang dikatakan Claude? File: file apa yang berubah? | Rujukan saat menelusuri masalah | Skill belum terbukti; error di Log | F9 | Penempatan diputuskan UX |

## 7. Data model
| Entitas | Field penting | Relasi | Catatan |
|---|---|---|---|
| Project | kunci (path folder awal sesi), nama, lastEventAt | punya banyak Run dan banyak Sesi | Aktif bila ada event dalam 6 jam |
| Sesi | session_id -> kunci Project | milik satu Project | Diikat pada event pertama (4a, ADR 0002); di memori, dipulihkan setelah restart lewat aturan "di dalam folder proyek yang dikenal" |
| Run | id, project, flow, prompt, startedAt, updatedAt, fase (berjalan, jeda, selesai, gagal), token setara, state, percakapan | milik satu Project | Batas run 4a (ADR 0001). Disimpan di SQLite; maks 200 run per proyek, yang tertua dihapus otomatis |
| Agent (definisi) | id, nama tampil, peran, fase/kolom, model, skill, sumber | dibaca dari folder agent (urutan menang di F2) dan `flows.json` | Bukan hard-code; agent baru muncul otomatis |
| Attention item | kunci identitas (4a), jenis (pertanyaan, izin, keputusan, gagal, selesai), run, agent, teks, pilihan, waktu, resolvedAt | milik satu Run | Dihitung dari event; tidak perlu disimpan permanen. Kunci yang sudah dilihat diingat bersama untuk semua tab di browser yang sama (lintas tab dan muat ulang, sesuai 4a) |
| Item backlog (dibaca) | id, judul, jenis, irisan (bagian), status, needs, checkpoint, alasan gagal, ukuran | dari `<proyek>/docs/backlog.json` | Hanya dibaca; viewer tidak mengubah backlog |
| Laporan token | proyek, run (maks 200), total, per run, per agent, pemanggilan termahal | dihitung dari Run tersimpan satu Project | Tidak disimpan di viewer; salinan markdown di `<proyek>/.flow-viewer/laporan-token.md` |
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
- A5. Kunci proyek = folder tempat sesi dimulai, diikat lewat `session_id` (4a, ADR 0002); bukan `cwd` tiap event. Dua sesi di folder yang sama berbagi satu tampilan. Dikonfirmasi pemilik (v1.2).
- A6. Proyek dianggap aktif bila ada event dalam 6 jam terakhir.
- A7. Bunyi pemberitahuan aktif secara default dengan tombol senyap; notifikasi desktop baru diminta saat pemilik mengaktifkannya.
- A8. Pembanding token = run sebelumnya pada proyek dan flow yang sama (aturan lengkap di 4a).
- A9. Agent baru dikenali dari definisi agent proyek dan `flows.json` (bukan dari daftar di kode).
- A10. Arah visual: gabungan kartu bergaya OrchestrateIQ dengan node bergaya n8n, tampak live, dengan kontras lebih kuat dan isi kartu berupa data nyata; bukan klon referensi. Dipilih pemilik.
- A11. Riwayat hanya menyimpan ringkasan run dan percakapan (bukan output tool lengkap), seperti versi 1.7.1.
- A12. Sinyal Butuh input hanya AskUserQuestion, permintaan izin, dan event Notification (F5). Akibatnya pertanyaan teks biasa diberitahukan terlambat (saat Notification datang, kira-kira 60 detik). Dikonfirmasi pemilik (v1.2).
- A13. Batas Agent diam = 10 menit tanpa event; batas Token boros = 150% pembanding. Angka diusulkan agent PRD, disetujui lewat "setuju rekomendasi" (v1.2); tetap (tidak bisa diatur di layar) di v2.
- A14. Notifikasi dari proyek lain: notifikasi desktop satu kali tanpa bunyi, plus penanda di pengalih proyek; angka judul tab hanya untuk proyek tab itu. Disetujui lewat "setuju rekomendasi" (v1.2).
- A15. Hapus run cukup satu konfirmasi (sebelumnya dua langkah); Reset run tetap dua langkah. Disetujui lewat "setuju rekomendasi" (v1.2).
- A16. "Bagian" backlog = field irisan (`slice`) yang sudah diisi skill backlog; viewer tidak menebak bagian dari judul item.

## 10. Open Questions
- [ ] Q1. Bentuk penempatan detail node dan Backlog/Skill/Log (tab, sidebar, sidebar setengah tersembunyi) dan susunan tiga indikator besar. (memblokir MVP: tidak; diputuskan di tahap UX)
- [ ] Q2. Gejala persis bug tombol Laporan di Riwayat yang dilihat pemilik (laporan proyek salah, tidak terbuka, isi tidak terbaca, atau lainnya). F12 sudah menetapkan perilaku benar; jawaban dipakai sebagai uji regresi. (memblokir MVP: tidak)

## 11. Decision Log
| Tanggal | Versi | Perubahan | Alasan |
|---|---|---|---|
| 2026-10-27 | 1.0 | PRD dibuat dan dikunci | Wawancara tiga putaran dengan pemilik; review skeptis: 14 celah, semua diselesaikan lewat asumsi A5-A11 atau diserahkan ke UX (Q1) |
| 2026-10-27 | 1.1 | F6: ringkasan otomatis hanya untuk run dengan agent atau file berubah; run singkat cukup tombol "Ringkasan" | Disetujui pemilik saat persetujuan UX |
| 2026-10-27 | 1.1 | Dicatat terlambat: ADR 0001 (batas run per prompt, Stop di tengah flow = jeda, prune 200 run per proyek) dan ADR 0002 (proyek diikat sesi, bukan `cwd` tiap event) diterima di tahap arsitektur; KEPUTUSAN.md butir 1-3 dijawab ya | Header PRD masih 1.0 dan kedua ADR belum tercermin di PRD (audit #12) |
| 2026-11-03 | 1.2 | Header versi diselaraskan dengan Decision Log; tambah bagian 4a (definisi mengikat) | Audit #12 |
| 2026-11-03 | 1.2 | Kunci proyek = folder awal sesi lewat `session_id` (4a, F1 deskripsi + 2 AC baru, A5, data model Sesi) | Audit #1, jawaban pemilik "setuju (folder awal sesi)" |
| 2026-11-03 | 1.2 | Definisi run, akhir run, fase Jeda dari ADR 0001 masuk PRD (4a, F6, data model Run) | Audit #2, pemilik setuju ADR 0001 masuk PRD |
| 2026-11-03 | 1.2 | F5: sinyal Butuh input hanya AskUserQuestion, izin, dan event Notification; teks berakhir `?` hanya membuat run Jeda tanpa pemberitahuan; Notification setelah Selesai tidak dobel (3 AC baru, A12) | Audit #3, jawaban pemilik. Menggantikan sebagian KEPUTUSAN butir 3 (judul tab tidak lagi menyebut Butuh input untuk teks `?`); ARCHITECTURE §5.3 perlu diselaraskan |
| 2026-11-03 | 1.2 | F8: daftar resmi perilaku Riwayat (8 butir) menggantikan "semua perilaku 1.7.1", merujuk ARCHITECTURE §10 | Audit #4, pemilik setuju §10 jadi daftar resmi |
| 2026-11-03 | 1.2 | "Setara input" didefinisikan dengan bobot token-report (1,25 / 0,1 / 5), selisih dalam persen (4a, F3) | Audit #5, setuju rekomendasi |
| 2026-11-03 | 1.2 | Aturan masalah dashboard: Agent diam > 10 mnt, Token boros > 150% pembanding (4a, F2, F3, F8, A13) | Audit #6, setuju rekomendasi (angka N/X diusulkan agent) |
| 2026-11-03 | 1.2 | F1: bagian "Proyek tidak aktif" di `/` yang bisa dibuka (run terakhir hanya baca); tab `?p=` tidak pernah melompat; `/` satu proyek langsung ke `?p=` | Audit #7, setuju rekomendasi |
| 2026-11-03 | 1.2 | F8: hapus run satu konfirmasi, run berjalan tidak bisa dihapus, prune 200 per proyek (3 AC baru, A15) | Audit #8, setuju rekomendasi; ARCHITECTURE §7.5 "dua langkah" perlu diselaraskan |
| 2026-11-03 | 1.2 | F5: angka judul tab hanya proyek tab itu; proyek lain = penanda pengalih + notifikasi desktop sekali tanpa bunyi (2 AC, A14) | Audit #9, setuju rekomendasi |
| 2026-11-03 | 1.2 | F2: urutan sumber definisi agent dan AC lebih dari 12 agent (uji 20) | Audit #10, setuju rekomendasi |
| 2026-11-03 | 1.2 | Identitas pemicu (4a) dan AC tidak dobel setelah muat ulang dan di dua tab | Audit #11, setuju rekomendasi |
| 2026-11-03 | 1.2 | "Terdeklarasi vs terbukti" didefinisikan di 4a dan dirujuk ke GLOSSARY.md | Audit #13, setuju rekomendasi; GLOSSARY.md belum memuat entri ini |
| 2026-11-03 | 1.2 | F11 baru (MVP): Backlog dikelompokkan per bagian (irisan), keadaan bagian, baris jawaban di atas; F9 merujuk F11 | Keluhan pemilik "backlog campur aduk bngt, kek gatau ini bagian apa apa apa" |
| 2026-11-03 | 1.2 | F4: pertanyaan utama detail, hierarki atas (status, satu kalimat, tiga angka), peringatan masalah di atas, bagian kosong satu baris, uji ui-critic design-principles (6 AC baru) | Keluhan pemilik "secara ui principle kurang di bagian detail" |
| 2026-11-03 | 1.2 | F12 baru (MVP): Laporan token proyek dengan perilaku benar tombol Laporan di Riwayat (satu per proyek, proyek tepat, state muat/galat/kosong, tutup tanpa kehilangan posisi); non-goals F10 diperjelas; Q2 gejala bug | Bug dilaporkan pemilik; fitur sudah ada di kode berjalan tapi belum ada di PRD |
| 2026-11-03 | 1.2 | Tabel Layar: kolom Jenis, Pertanyaan utama, Keputusan, Keadaan masalah untuk semua layar; Backlog dan Laporan token jadi baris sendiri; walkthrough langkah 5, 9, 10 | Permintaan pemilik: tiap layar/panel punya pertanyaan utama dan Jenis |
