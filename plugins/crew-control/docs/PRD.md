# PRD: Crew Control (pengganti Flow Viewer)
Status: Locked · Versi: 1.0 · Terakhir diubah: 2026-11-04

## 1. Masalah & tujuan
ryama-kit menjalankan tim agent (sekarang: tim Fullstack) di Claude Code. Pemilik mengirim satu prompt lalu ingin pergi, tetapi hari ini ia harus bolak-balik ke aplikasi Claude untuk menjawab, menulis `/clear` lalu `/fullstack-dev:run` tiap batch, dan menilai hasil dari teks "tes lulus". Data TOconnect: 86 jam kerja, 33 jam di antaranya menunggu pemilik; backlog melar 147 -> 258 item; 570 jt token; masalah kit baru ketahuan lewat evaluasi manual (EVALUASI-KIT).
Flow Viewer hanya *memantau*; tampilannya grafik padat yang menjawab "siapa nyambung ke siapa", bukan "apa yang butuh saya" atau "apakah hasilnya bagus".
Tujuan: **Crew Control**, dashboard yang menjalankan dan mengendalikan tim agent dari laptop atau HP, berhenti hanya saat pemilik memang dibutuhkan (pertanyaan, izin, review milestone), dan menyajikan hasil sebagai bukti yang gampang dinilai. Inti dashboard netral tim: tim Fullstack hanyalah isi pertama; tim lain (content creator, AI/ML) nanti cukup menambah definisi tim, tanpa mengubah dashboard.

## 2. User
| Peran | Kebutuhan utama | Hak akses |
|---|---|---|
| Pemilik (satu orang; laptop Windows + HP) | Mulai run, jawab pertanyaan dan izin, review milestone dari bukti, pantau token dan waktu, nilai kesehatan kit | Penuh. Tanpa akun; akses hanya dari laptop sendiri (localhost) dan perangkat di jaringan Tailscale pemilik |

## 3. Non-goals
- Bukan produk multi-user atau publik: tanpa akun, berbagi tautan, atau akses dari internet terbuka.
- Tidak push, merge ke branch utama, atau deploy. Commit hanya lokal; push tetap manual.
- Tidak membuat agent sendiri lewat API/SDK. Agent tetap Claude Code (program `claude` asli) dengan plugin ryama-kit.
- Tim content creator dan AI/ML belum dibangun. Yang dibangun hanya kemampuan dashboard menerima definisi tim lain.
- Grafik lengkap di HP (HP versi ringkas saja).
- Ganti akun Claude otomatis saat kena batas pemakaian.
- Membatalkan (revert) satu batch dari dashboard (Nanti).
- Ekspor laporan teks (Nanti).

## 4. Walkthrough
1. Pemilik membuka Crew Control di laptop (localhost) atau di HP (lewat Tailscale). Halaman awal: daftar proyek dengan status (jalan / butuh kamu / jeda limit / siap review / diam), jumlah "butuh kamu" per proyek, tombol **Run baru**.
2. **Run baru**, seperti kotak ketik di aplikasi Claude: pilih folder proyek (folder kerja itu sendiri, folder di kedalaman berapa pun di bawahnya, atau buat folder baru di bawah folder kerja; tidak bisa naik di atas folder kerja), pilih tim (Fullstack), pilih perintah tim (mulai dari ide / lanjut backlog / prompt bebas), pilih model dari daftar (tidak diketik), ketik isinya, tekan Enter. Folder dan model terakhir sudah terpilih, jadi run berikutnya cukup diketik. Bila folder yang dipilih adalah folder kerja itu sendiri, tampil satu baris peringatan bahwa agent bisa mengubah seluruh isinya tanpa bertanya.
3. Layar proyek, tiga kolom. **Kiri**: daftar agent tim dengan lampu status + teks. **Tengah**: grafik alur live ala n8n (bisa dialihkan ke timeline). **Kanan**: panel **Chat** (default) dan tab **Detail agent**. Bar atas: milestone aktif ("UI · 7/24 item"), token, durasi, Jeda, Stop.
4. Agent bertanya: pertanyaannya masuk ke Chat sebagai pesan dengan pilihan yang bisa diklik (atau ketik jawaban sendiri); node dan baris agent itu ditandai "Butuh kamu"; judul tab, bunyi, dan push ke HP. Pemilik menjawab di Chat, agent lanjut.
5. Agent minta izin: pesan izin di Chat dengan Setujui / Tolak (dengan alasan) / Selalu setujui.
6. Pemilik bisa mengetik ke orkestrator kapan saja di Chat ("stop dulu fe, dahulukan bug login"); pesan masuk ke sesi yang sedang jalan. Bila run terakhir proyek itu sudah Selesai, pemilik tetap bisa mengetik di Chat-nya seperti melanjutkan obrolan di aplikasi Claude: sesi yang sama dilanjutkan dan run itu kembali Jalan. Run lama yang dibuka dari Riwayat hanya bisa dibaca.
7. Satu batch selesai: commit lokal otomatis, sesi baru dibuka otomatis untuk batch berikutnya. Pemilik tidak dipanggil.
8. Kena batas pemakaian: run dijeda, pemberitahuan berisi jam reset; run lanjut sendiri di run yang sama setelah reset.
9. Milestone selesai: run berhenti dengan status **Siap review** + pemberitahuan. Layar Review: galeri bukti per item (screenshot, mockup, diagram DB, grafik stress test, hasil tes), ringkasan perubahan, token dan waktu. **Setujui** -> milestone berikutnya jalan. **Minta perbaikan** (catatan per item) -> jadi item perbaikan di milestone itu, run lanjut otomatis, lalu milestone kembali Siap review.
10. Sesi Claude Code yang pemilik buka sendiri di aplikasi desktop juga tampil (label "dari desktop"): bisa dijawab, diberi izin, dan di-stop, tetapi tidak bisa dikirimi prompt.
11. Layar **Kesehatan kit**: token per item, per agent, per milestone; waktu menunggu pemilik; revisi berulang; backlog melar; dibanding run sebelumnya.
12. Di HP: daftar proyek, Chat (jawab dan izin), mulai/jeda/stop run, review milestone. Tanpa grafik.

## 5. Fitur

### F1. Tim sebagai data · Prioritas: MVP
Dashboard membaca definisi tim (daftar agent, peran, model, skill, alur/flow, perintah yang bisa dimulai, jenis milestone, jenis bukti) dari plugin tim. Tidak ada nama agent, flow, atau perintah tim yang ditulis di kode dashboard.
Acceptance criteria:
- [ ] Diberikan agent baru ditambahkan ke plugin tim, ketika run berikutnya dimulai, maka agent itu muncul di kolom kiri dan grafik tanpa mengubah kode dashboard.
- [ ] Diberikan definisi tim kedua berisi satu agent tiruan (fixture tes), ketika dashboard dimuat, maka tim itu bisa dipilih di Run baru dan run-nya tampil dengan tiga kolom yang sama.
- [ ] Perintah di Run baru diambil dari definisi tim, bukan daftar di kode.
Edge case:
- Definisi tim rusak/tidak lengkap -> tim tidak bisa dipilih, pesan menyebut berkas dan bagian yang salah; tim lain tetap jalan.
- Agent dipanggil tapi tidak ada di definisi tim -> tampil sebagai "di luar tim", tetap terpantau.

### F2. Run dijalankan dashboard (harness) · Prioritas: MVP
Dashboard memulai, menjeda, melanjutkan, dan menghentikan sesi Claude Code (program `claude` asli, mode tanpa layar) di folder proyek, dengan plugin tim aktif. Run baru memuat pilihan model (dipilih dari daftar model yang disediakan server, saat ini Opus, Sonnet, Haiku); model disimpan per run dan berlaku untuk sesi utama (orkestrator). Agent tim tetap memakai model dari definisi tim (F1, F4). Folder proyek boleh folder kerja itu sendiri atau folder di kedalaman berapa pun di bawahnya.
Acceptance criteria:
- [ ] Diberikan pemilik mengisi Run baru dan menekan Mulai (atau Enter), maka dalam 5 detik run tampil berstatus Jalan dan event pertama muncul di grafik.
- [ ] Diberikan Run baru dibuka, ketika pemilik membuka pilihan model, maka model tampil sebagai daftar pilihan (nama + satu baris keterangan) dan tidak ada kolom untuk mengetik nama model.
- [ ] Diberikan pemilik memilih model Haiku lalu Mulai, ketika run dibuka di layar proyek atau di Riwayat, maka run itu menampilkan model Haiku, dan sesi utamanya berjalan dengan Haiku (terlihat di Detail agent orkestrator sebagai model terpakai).
- [ ] Diberikan pemilik pernah memulai run, ketika Run baru dibuka lagi di perangkat yang sama, maka folder dan model run terakhir sudah terpilih; bila belum pernah ada run, model = model bawaan server dan folder = folder kerja.
- [ ] Diberikan pemilik tidak memilih model, ketika Mulai, maka run memakai model bawaan server dan model itu tetap tersimpan di run.
- [ ] Diberikan pemilik membuka pemilih folder, ketika ia masuk ke subfolder lalu ke subfolder di dalamnya (3 tingkat atau lebih), maka setiap tingkat bisa dibuka dan dipilih sebagai folder proyek; jejak path dimulai dari folder kerja dan tidak ada jalan naik di atasnya.
- [ ] Diberikan folder yang dipilih adalah folder kerja itu sendiri, ketika Run baru tampil, maka satu baris peringatan tetap terlihat di bawah kotak ketik: "Agent bisa mengubah semua isi <nama folder kerja> tanpa bertanya.", dan Mulai tetap diizinkan.
- [ ] Diberikan folder yang dipilih bukan folder kerja itu sendiri, maka peringatan itu tidak tampil.
- [ ] Stop menghentikan seluruh run dalam 10 detik; status Dihentikan; pekerjaan yang belum di-commit tetap ada di folder (tidak dibuang).
- [ ] Jeda menahan run setelah langkah alat yang sedang berjalan selesai; Lanjut meneruskan di run dan sesi yang sama.
- [ ] Satu proyek hanya boleh punya satu run aktif; Mulai kedua ditolak dengan pesan dan tautan ke run aktif.
- [ ] Sampai 3 proyek bisa jalan bersamaan tanpa data tercampur.
- [ ] Folder proyek baru hanya bisa dibuat di bawah folder kerja yang diizinkan (default `D:\01_Workspace`), di kedalaman berapa pun.
- [ ] Diberikan permintaan run dengan folder di luar folder kerja (termasuk lewat `..` atau pintasan folder yang menunjuk keluar), ketika dikirim, maka run ditolak dengan pesan dan tidak ada sesi yang dimulai.
Edge case:
- Model yang dikirim tidak ada di daftar server -> run ditolak dengan pesan, tidak memakai model lain diam-diam.
- Model yang tersimpan sebagai pilihan terakhir sudah tidak ada di daftar server -> pilihan kembali ke model bawaan server.
- Folder yang tersimpan sebagai pilihan terakhir sudah dihapus atau di luar folder kerja -> pilihan kembali ke folder kerja, dengan pesan satu baris.
- Folder berisi sangat banyak subfolder -> daftar dibatasi 500 per tingkat (urut nama); folder tersembunyi, `node_modules`, dan pintasan yang keluar folder kerja tidak ditampilkan.
- Proses `claude` mati tiba-tiba -> run berstatus Gagal dengan alasan dan log terakhir; tombol Lanjutkan membuka sesi baru di run yang sama.
- Server dashboard restart saat run jalan -> run tampil Terputus; Lanjutkan membuka sesi baru dari status backlog.
- Laptop tidur atau mati -> run berhenti; saat dashboard hidup lagi run tampil Terputus (bukan Jalan).

### F3. Batch dan milestone otomatis · Prioritas: MVP
Run berjalan per batch (default 5 item backlog) dengan commit lokal otomatis per batch dan sesi baru per batch, berhenti hanya saat: milestone selesai, ada keputusan/pertanyaan pemilik, batas pemakaian, item gagal 2 kali, atau backlog habis. Batas milestone diusulkan agent backlog per scope (mis. "UI 24 item") dan disetujui pemilik sekali di awal.
Acceptance criteria:
- [ ] Diberikan milestone 12 item dan batch 5, ketika run berjalan tanpa gangguan, maka terjadi 3 batch, 3 commit lokal, dan run berhenti di Siap review tanpa input pemilik di tengahnya.
- [ ] Usulan milestone tampil di Chat untuk disetujui atau diubah sebelum batch pertama.
- [ ] Item yang gagal 2 kali menghentikan run dengan pesan di Chat (item, agent, alasan).
- [ ] Item yang menunggu keputusan pemilik tampil di Chat; item lain yang tidak bergantung padanya tetap dikerjakan.
- [ ] Riwayat batch (item, commit, token, durasi) terlihat di run.
Edge case:
- Proyek tanpa backlog (prompt bebas) -> tanpa batch/milestone; run berakhir saat sesi berhenti.
- Commit gagal (mis. konflik, repo bukan git) -> run dijeda, alasan di Chat; tidak lanjut batch berikutnya.
- Agent menambah item baru di tengah milestone -> item masuk milestone yang sama bila agent backlog menandainya begitu, dan penambahan tercatat (untuk F9).

### F4. Layar proyek tiga kolom · Prioritas: MVP
Kiri: agent tim dengan status. Tengah: grafik alur live ala n8n, bisa dialihkan ke timeline. Kanan: Chat (default) dan Detail agent. Bar atas: milestone aktif dan progresnya, token, durasi, Jeda, Stop.
Acceptance criteria:
- [ ] Status agent: Jalan, Butuh kamu, Siap/diam, Selesai, Gagal, Dilewati; dibedakan dengan warna **dan** ikon/teks.
- [ ] Event baru memperbarui kolom kiri, grafik, dan Chat dalam 1 detik tanpa muat ulang.
- [ ] 12 agent tampil di grafik tanpa saling menimpa; ada zoom, geser, dan pas layar.
- [ ] Klik agent (kiri atau grafik) membuka tab Detail agent: tugas, model terdeklarasi vs terpakai, skill, tool/MCP, langkah kerja, file berubah, token, durasi, bukti item. Agent yang belum jalan menampilkan definisinya.
- [ ] Saat tab Detail terbuka dan pertanyaan baru masuk, tab Chat diberi lencana jumlah; grafik dan posisi zoom tidak berubah.
- [ ] Timeline menampilkan agent yang berjalan paralel sebagai batang yang tumpang tindih.
Edge case:
- Belum ada run -> grafik menampilkan tim dalam keadaan diam dan satu ajakan "Mulai run".
- Agent jalan berkali-kali -> jumlah putaran tampil di node.

### F5. Chat: pertanyaan, izin, dan pesan ke orkestrator · Prioritas: MVP
Panel Chat seperti chat Claude: pesan agent, pertanyaan berpilihan (bisa diklik atau dijawab bebas), permintaan izin, pesan sistem (batch selesai, limit, gagal), dan kotak ketik ke orkestrator (Enter mengirim, Shift+Enter baris baru). Run terakhir sebuah proyek yang sudah Selesai tetap bisa dilanjut dengan mengetik, seperti melanjutkan obrolan di aplikasi Claude; run lama yang dibuka dari Riwayat tetap baca saja.
Acceptance criteria:
- [ ] Diberikan run terakhir proyek berstatus Selesai dan proyek tidak punya run aktif lain, ketika pemilik mengetik pesan di Chat run itu dan menekan Enter, maka sesi yang sama dilanjutkan (agent ingat percakapan sebelumnya), run yang sama kembali berstatus Jalan dengan model yang sama, dan tidak ada run baru di Riwayat.
- [ ] Diberikan run yang dibuka dari Riwayat bukan run terakhir proyeknya, maka Chat-nya tidak punya kotak ketik dan tombol jawab; tampil keterangan "Baca saja" dengan tautan ke run terakhir proyek.
- [ ] Diberikan run terakhir proyek berstatus Selesai tetapi folder proyek sudah dihapus atau di luar folder kerja, ketika pemilik mengirim pesan, maka pesan ditolak dengan alasan dan run tetap Selesai.
- [ ] Pertanyaan berpilihan tampil dengan pilihannya sebagai tombol; memilih atau mengetik jawaban meneruskannya ke sesi dan agent lanjut.
- [ ] Permintaan izin: Setujui / Tolak (dengan alasan opsional, diteruskan ke agent) / Selalu setujui (aturan disimpan untuk proyek itu).
- [ ] Pesan ketikan pemilik masuk ke sesi run aktif; bila run sedang dijeda, pesan dikirim saat dilanjutkan dan ditandai "terkirim saat lanjut".
- [ ] Pertanyaan yang sudah dijawab (dari dashboard atau dari aplikasi desktop) berubah jadi terjawab dalam 2 detik dan tidak memicu pemberitahuan lagi.
- [ ] Jawaban dari dua perangkat bersamaan: yang pertama dipakai, perangkat kedua melihat "sudah dijawab".
Edge case:
- Pertanyaan > 4 pilihan atau multi-pilih -> tetap bisa dijawab sesuai format aslinya.
- Teks agent berisi HTML/markdown berbahaya -> ditampilkan sebagai teks aman.
- Melanjutkan run Selesai saat proyek itu sudah punya run aktif lain, atau batas run bersamaan sudah penuh -> pesan ditolak dengan alasan dan tautan ke run aktif; teks yang diketik tidak hilang.
- Run Selesai yang dilanjutkan lalu selesai lagi -> tetap satu run; Chat, token, dan riwayat batch-nya menyambung.

### F6. Pemberitahuan · Prioritas: MVP
Pemicu: pertanyaan, izin, milestone Siap review, run gagal/terhenti, batas pemakaian. Bentuk: judul tab (`(N) Butuh kamu · <proyek>`), bunyi singkat, notifikasi desktop, dan push ke HP (dashboard dipasang sebagai aplikasi web di HP).
Acceptance criteria:
- [ ] Diberikan browser HP tertutup dan dashboard terpasang di layar HP, ketika agent bertanya, maka push muncul dalam 10 detik berisi proyek dan potongan pertanyaan; mengetuknya membuka Chat proyek itu.
- [ ] Pemicu yang sama tidak diulang; pemberitahuan hilang setelah dijawab.
- [ ] Bunyi bisa dimatikan dan pilihan diingat; izin notifikasi baru diminta saat pemilik menekan Aktifkan.
- [ ] Batch selesai dan commit tidak memicu pemberitahuan.
Edge case:
- Izin push ditolak atau perangkat tidak mendukung -> judul tab dan bunyi tetap jalan; petunjuk cara mengaktifkan.
- HP di luar Tailscale -> push tetap terkirim (layanan push browser), tetapi membuka dashboard butuh Tailscale aktif; pesan menjelaskan.

### F7. Review milestone dengan galeri bukti · Prioritas: MVP
Layar Review: daftar item milestone sebagai kartu bukti (gambar, halaman mockup, diagram, grafik, hasil tes, ringkasan diff), ringkasan perubahan (file, commit), token dan waktu dibanding milestone sejenis sebelumnya. Aksi: Setujui, Minta perbaikan (catatan per item).
Acceptance criteria:
- [ ] Setiap item tampil dengan minimal satu bukti; item tanpa bukti ditandai "tanpa bukti" dan dihitung di ringkasan.
- [ ] Bukti gambar dan halaman mockup bisa dibuka ukuran penuh; diagram (mis. Mermaid) dan grafik dirender, bukan teks mentah.
- [ ] Setujui -> milestone berstatus Disetujui dan milestone berikutnya mulai otomatis.
- [ ] Minta perbaikan -> setiap catatan menjadi item perbaikan di milestone itu, run lanjut otomatis, dan setelah selesai milestone kembali Siap review dengan item perbaikan ditandai.
- [ ] Review bisa dibuka dan diselesaikan dari HP.
Edge case:
- Bukti berukuran besar (video, gambar > 5 MB) -> tampil pratinjau, berkas asli dibuka terpisah.
- Berkas bukti hilang dari folder -> kartu menyebut path yang hilang, bukan gambar rusak.

### F8. Kontrak bukti untuk tim · Prioritas: MVP
Aturan yang wajib dipenuhi semua tim: tiap item selesai menyimpan bukti di lokasi dan format yang dikenali dashboard (gambar, HTML mockup, Mermaid, data grafik, ringkasan teks, hasil tes), dengan keterangan satu kalimat. Agent tim Fullstack diubah agar memenuhinya: UI -> screenshot/mockup; backend -> diagram struktur DB atau alur logika + hasil tes; stress/performa -> grafik; keamanan -> ringkasan temuan.
Acceptance criteria:
- [ ] Kontrak tertulis (format, lokasi, jenis per pekerjaan) ada di dokumen kit dan dirujuk definisi tim.
- [ ] Pada satu milestone uji tim Fullstack, >= 90% item punya bukti yang dirender di galeri.
- [ ] Item backend menghasilkan diagram struktur DB atau alur logika yang terbaca tanpa membaca kode.
Edge case:
- Pekerjaan tanpa hasil visual (refactor, konfigurasi) -> bukti berupa ringkasan sebelum/sesudah + hasil tes.

### F9. Kesehatan kit · Prioritas: MVP
Satu layar evaluasi lintas run: token per item, per agent, per milestone; waktu menunggu pemilik (dari pertanyaan masuk sampai dijawab); revisi berulang (item perbaikan dan retry per item asal); backlog melar (item ditambah setelah milestone mulai); agent paling boros; dibanding run sebelumnya.
Acceptance criteria:
- [ ] Bisa disaring per proyek, per tim, dan rentang tanggal.
- [ ] Setiap angka bisa diklik sampai ke item atau run asalnya.
- [ ] Angka yang belum punya data menampilkan "belum ada data", bukan 0.

### F10. Sesi dari aplikasi desktop · Prioritas: MVP
Sesi Claude Code yang dibuka pemilik sendiri tetap dipantau lewat hook seperti sekarang: tampil berlabel "dari desktop", pertanyaan dan izinnya bisa dijawab dari Chat, dan bisa di-stop. Tidak bisa dikirimi prompt.
Acceptance criteria:
- [ ] Diberikan sesi desktop meminta izin, ketika pemilik menekan Setujui di dashboard, maka sesi desktop melanjutkan tanpa menunggu klik di aplikasi desktop.
- [ ] Sesi yang dijalankan dashboard tidak muncul dua kali (event dari hook dan dari harness digabung per sesi).
Edge case:
- Pemilik menjawab di aplikasi desktop lebih dulu -> pertanyaan di dashboard berubah jadi terjawab.

### F11. HP versi ringkas · Prioritas: MVP
Di layar sempit: daftar proyek + status, Chat per proyek, Run baru, Jeda/Stop, review milestone. Tanpa grafik dan kolom agent (diganti daftar status agent singkat).
Acceptance criteria:
- [ ] Semua aksi di atas bisa dilakukan di lebar 375 px tanpa geser horizontal.
- [ ] Dashboard bisa dipasang ke layar utama HP sebagai aplikasi web.

### F12. Riwayat · Prioritas: MVP
Daftar run per proyek (judul dari prompt/perintah, bukan nama flow saja), status akhir, model, milestone, token, durasi; buka run lama (baca saja) termasuk Chat dan galeri bukti; banding token dua run. Pengecualian: run terakhir proyek yang berstatus Selesai dibuka sebagai run yang bisa dilanjut (F5).
Acceptance criteria:
- [ ] Run yang sudah selesai tidak pernah berlabel "sedang berjalan". Run Selesai yang dilanjut dengan mengetik (F5) berlabel Jalan hanya selama sesinya benar-benar berjalan.
- [ ] Setiap baris Riwayat menampilkan model run itu.
- [ ] Dua run berbeda tim/perintah bisa dibandingkan dengan peringatan "tidak setara".

### F13. Tema dan bahasa · Prioritas: MVP
Terang/gelap (ikut sistem pada kunjungan pertama, pilihan diingat), kontras WCAG AA. Bahasa antarmuka: Indonesia.

### F14. Batalkan satu batch · Prioritas: Nanti
### F15. Jawab pertanyaan langsung dari notifikasi HP · Prioritas: Nanti
### F16. Ekspor laporan milestone (markdown) · Prioritas: Nanti

## 6. Layar
Alur dan isi tiap layar: `docs/UX.md` (disetujui pemilik 2026-11-04).

| Layar | Jenis (tugas / dashboard / pemasaran) | Tujuan | Fitur | Wireframe |
|---|---|---|---|---|
| Daftar proyek (`/`) | dashboard | "Proyek mana yang butuh saya sekarang?"; mulai run | F2, F6, F11 | Kasar: daftar kartu status + Run baru; rinci di UX.md |
| Run baru | tugas | Memilih folder, tim, perintah, model, lalu ketik dan Enter | F1, F2 | Kotak ketik seperti aplikasi Claude, tombol folder/tim/model di bawahnya (UX.md) |
| Layar proyek | dashboard | "Apa yang sedang dikerjakan, dan apakah ada yang menunggu saya?"; kendali run | F3, F4, F5, F10 | Disetujui 2026-11-04: tiga kolom (agent / grafik-timeline / Chat + Detail agent), bar atas milestone-token-durasi-kendali. Tanpa banner pemberitahuan besar di atas |
| Review milestone | tugas | Menilai hasil dari bukti, lalu Setujui atau Minta perbaikan | F7, F8 | Disetujui: ringkasan + aksi di atas, galeri kartu bukti |
| Kesehatan kit | dashboard | "Di mana kit boros atau membuat saya menunggu, dan apakah membaik?" | F9 | UX.md (6 angka + pembanding, tabel rincian) |
| Riwayat | tugas | Mencari satu run lama dan membandingkan dua run | F12 | UX.md |
| HP | dashboard | Versi ringkas semua aksi; "apa yang butuh saya?" | F11 | Disetujui: daftar proyek + Chat + kendali, tanpa grafik |

## 7. Data model
| Entitas | Field penting | Relasi | Catatan |
|---|---|---|---|
| Team (definisi) | id, nama, agent[], flow, perintah[], jenis milestone, jenis bukti | dibaca dari plugin tim | Bukan hard-code |
| Agent (definisi) | id, nama, peran, model, skill, tool | milik Team | Dari `agents/*.md` |
| Project | path folder, nama, tim default, lastActivity | punya banyak Run | Kunci = folder tempat sesi dimulai |
| Run | id, project, team, perintah, isi prompt, model (sesi utama), status, asal (dashboard/desktop), mulai, selesai | punya Session, Batch, Milestone, Message | Status: jalan, butuh kamu, dijeda, jeda limit, siap review, terhenti, gagal, selesai, terputus. Run terakhir proyek berstatus selesai bisa kembali jalan bila dilanjut lewat Chat (F5) |
| Session | id sesi Claude Code, run, batch, mulai, selesai, akhir (normal/limit/gagal) | milik Run | Satu batch = satu sesi |
| Milestone | id, run, nama, item[], status (usulan, disetujui-mulai, jalan, siap review, disetujui), token, durasi | milik Run; item dari backlog | Diusulkan agent backlog |
| Batch | nomor, item[], commit hash, token, durasi | milik Run/Milestone | |
| Item (cermin backlog) | id backlog, judul, agent, status, retry, asal (asli/perbaikan/ditambah), bukti[] | milik Milestone | Sumber tetap `docs/backlog.json` |
| Evidence | item, jenis, path, keterangan, ukuran | milik Item | Disimpan di folder proyek, dashboard hanya membaca |
| Message | run, jenis (agent, pertanyaan, izin, pemilik, sistem), teks, pilihan, jawaban, dijawabDari, waktu masuk, waktu dijawab | milik Run | Sumber waktu menunggu pemilik (F9) |
| AgentActivity | run, sesi, agent, tool call, file, token, durasi | milik Session | Dari hook/transkrip |
| Pengaturan | tema, bunyi, izin notifikasi, langganan push per perangkat, folder kerja yang diizinkan, ukuran batch, folder dan model terakhir di Run baru | per pemilik / per perangkat | Folder kerja ditetapkan di server (hanya dibaca di layar); folder dan model terakhir per perangkat |

Hapus: run lama bisa dihapus dari Riwayat (data dashboard saja; commit dan bukti di proyek tidak disentuh).

## 8. Constraint teknis
- Stack: diputuskan architect. Batasan v2 lama ("tanpa dependensi baru, HTML/JS vanilla") dicabut.
- Jalan: satu server di laptop Windows pemilik; dibuka di `localhost` dan lewat Tailscale (HTTPS dari Tailscale untuk push dan pemasangan di HP). Tidak terbuka ke internet publik.
- Integrasi: program `claude` asli (mode tanpa layar) untuk run dashboard; hook Claude Code untuk sesi desktop; transkrip Claude Code untuk token dan model; `docs/backlog.json` dan skrip backlog kit; git lokal untuk commit.
- Keamanan: karena dashboard bisa menjalankan agent di laptop, semua aksi kendali hanya diterima dari localhost atau alamat Tailscale; folder kerja dibatasi; teks agent dirender aman; tidak ada rahasia di halaman.
- Kinerja: pembaruan <= 1 detik di laptop; 12 agent per tim; 3 run bersamaan.
- Bahasa UI: id. Sistem: Windows/PowerShell.
- Privasi: semua data lokal; riwayat tidak masuk git.
- Lokasi kode: plugin di ryama-kit (nama folder diputuskan architect). Dokumen Flow Viewer v2 diarsipkan; kode server lama boleh dipakai ulang bila cocok.

## 9. Assumptions
> Pemilik wajib membaca bagian ini.
- A1. Kendali penuh lewat program `claude` asli dengan login langganan pemilik. **Terverifikasi 2026-11-04** (docs/KEPUTUSAN.md, bagian Spike A1): diizinkan dokumen resmi Anthropic untuk pemakaian sendiri, dengan syarat dashboard menjalankan program `claude` asli (bukan Agent SDK), tidak membaca/menyimpan/meneruskan token login, dan tidak memakai `--bare`. Jalur harness dipakai; F2/F3 tetap MVP. Jalur cadangan (kendali lewat hook) tetap tersedia karena dibangun untuk F10.
- A2. Kemampuan teknis: **terbukti di spike 2026-11-04** (docs/KEPUTUSAN.md, bagian Spike A2): menjawab pertanyaan berpilihan, Setujui/Tolak dengan alasan, pesan ke sesi yang berjalan, Jeda/Lanjut di sesi sama, Stop dalam ~2 detik. Izin dan jawaban untuk sesi aplikasi desktop terbukti lewat simulasi dengan mekanisme yang sama; **uji tangan 2 menit di aplikasi desktop masih menunggu pemilik** dan menjadi syarat lulus AC F10, bukan penghalang build.
- A3. Mode izin untuk run dashboard: perubahan file dan perintah di dalam folder proyek disetujui otomatis; yang di luar folder proyek atau merusak (hapus massal, push, instal global) ditanyakan lewat Chat. **Default ini dipakai (Q1, 2026-11-04).** Pemilik menyetujui bahwa run boleh dimulai di folder kerja itu sendiri; akibatnya izin otomatis berlaku untuk seluruh isi folder kerja, dan Run baru menampilkan peringatan satu baris (F2).
- A4. Ukuran batch default 5 item, bisa diubah per proyek.
- A5. Batas pemakaian: jam reset dibaca dari pesan Claude Code; bila tidak terbaca, dicoba lagi tiap 30 menit.
- A6. Laptop dibiarkan menyala selama run (AnyDesk tanpa pengawasan sudah diatur). Laptop tidur = run terputus (F2 edge case).
- A7. Satu akun Claude dipakai bersama oleh semua run yang berjalan bersamaan; ganti akun tetap manual.
- A8. Pertanyaan hanya datang dari sesi utama (orkestrator); subagent tidak bisa bertanya langsung (batasan Claude Code), jadi pertanyaan subagent diteruskan orkestrator.
- A9. Riwayat Flow Viewer 1.x tidak dimigrasi; berkas lamanya dibiarkan.
- A10. Arah visual tidak ditentukan PRD. Hanya struktur yang dikunci (lihat Layar). Gaya diputuskan ui-designer setelah PRD Locked.
- A11. "Proyek baru" = folder baru + git init di bawah folder kerja (kedalaman berapa pun); isinya dibuat oleh perintah tim (mis. start).
- A12. Model yang dipilih di Run baru hanya mengatur sesi utama (orkestrator); agent tim tetap memakai model dari definisi tim. Diambil dari docs/UX.md (U8, disetujui pemilik).
- A13. Hanya run **terakhir** sebuah proyek yang berstatus **Selesai** yang bisa dilanjut dengan mengetik. Run Gagal/Terputus tetap memakai Lanjutkan (sesi baru, F2); run Dihentikan dan run lama lain di Riwayat baca saja. Pemilik hanya menyebut "Selesai"; status lain tidak diperluas tanpa persetujuan.

## 10. Open Questions
- [x] Q1. Mode izin run dashboard (A3) sudah sesuai? **Terjawab 2026-11-04:** default A3 dipakai; pemilik menyetujui run di folder kerja itu sendiri dengan peringatan satu baris (A3, F2).
- [x] Q2. Hasil verifikasi kebijakan login (A1) dan spike teknis (A2). **Terjawab 2026-11-04 oleh spike (docs/KEPUTUSAN.md):** A1 boleh, A2 terbukti; sesi desktop masih menunggu uji tangan pemilik (lihat A2, F10).
- [ ] Q3. Batas run bersamaan dengan langganan Pro: F2 menulis "sampai 3 proyek bersamaan", KEPUTUSAN merekomendasikan mulai dengan 1 run aktif lalu ukur pemakaian. (memblokir MVP: tidak; sampai dijawab, batas bawaan 1 dan AC 3 run bersamaan diuji dengan batas dinaikkan ke 3)

## 11. Decision Log
| Tanggal | Versi | Perubahan | Alasan |
|---|---|---|---|
| 2026-11-04 | 0.9 | PRD baru menggantikan Flow Viewer v2 (arsip) | Tampilan v2 tetap padat di semua arah desain karena PRD mewajibkan terlalu banyak info sekaligus; pemilik ingin mulai dari nol dengan konsep tim agent, harness, dan kendali penuh |
| 2026-11-04 | 0.9 | Kendali penuh lewat harness; HP lewat Tailscale + versi ringkas; commit otomatis per batch, review per milestone; kontrak bukti; Kesehatan kit di MVP; chat di kolom kanan (bukan banner) | Wawancara 6 putaran dengan pemilik |
| 2026-11-04 | 0.9 | Nama: Crew Control | Dipilih pemilik; bukan lagi sekadar viewer |
| 2026-11-04 | 0.9 | Dokumen Flow Viewer v2 diarsipkan ke `plugins/flow-viewer/_arsip-v2/`; PRD ini disimpan di `plugins/crew-control/docs/PRD.md` | Permintaan pemilik |
| 2026-11-04 | 0.9 | Ditegaskan: semua yang "butuh kamu" (pertanyaan dan izin) adalah pesan di Chat, sama seperti chat Claude; tidak ada banner/inbox terpisah | Konfirmasi pemilik |
| 2026-11-04 | 1.0 | docs/UX.md disetujui dan dirujuk dari bagian Layar; tabel Layar diberi kolom Jenis dan pertanyaan utama tiap dashboard | Persetujuan pemilik no. 1 |
| 2026-11-04 | 1.0 | F2: pilihan model di Run baru (dipilih dari daftar, disimpan per run, berlaku untuk orkestrator), folder dan model terakhir diingat; walkthrough langkah 2; Run.model dan Pengaturan diperbarui; F12 menampilkan model | Pemilik: "modelnya ko ngetik sendiri harusnya milih ... kaya claude apps dah dari cara promptingnya, enternya, chatnya, approvenya" |
| 2026-11-04 | 1.0 | F5: run terakhir proyek yang sudah Selesai bisa dilanjut dengan mengetik (sesi sama, run sama kembali Jalan); run lama dari Riwayat tetap baca saja; walkthrough langkah 6, F12, A13 | Persetujuan pemilik (catatan yang sama: perilaku seperti aplikasi Claude) |
| 2026-11-04 | 1.0 | F2 dan A3: run boleh dimulai di folder kerja itu sendiri dengan peringatan satu baris; pemilih folder masuk ke kedalaman berapa pun di bawah folder kerja, tidak bisa naik di atasnya | Persetujuan pemilik; izin otomatis A3 lalu berlaku untuk seluruh isi folder kerja |
| 2026-11-04 | 1.0 | Q1 dan Q2 ditandai terjawab; A1 dan A2 diperbarui dari hasil spike; Q3 (batas run bersamaan di Pro) dicatat dari KEPUTUSAN; Status Locked | Spike architect (docs/KEPUTUSAN.md); tidak ada lagi Open Question yang memblokir MVP |
