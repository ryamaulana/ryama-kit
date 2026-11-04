# Crew Control

Dashboard pribadi untuk menjalankan dan mengendalikan tim agent ryama-kit dari laptop atau HP, berhenti hanya saat pemilik dibutuhkan, dan menyajikan hasil sebagai bukti.

## Kerja dan jalannya

**Run**:
Satu kali kerja tim di satu proyek, dari Mulai sampai berhenti; bisa berisi banyak sesi dan batch.
_Avoid_: job, sesi (untuk arti ini)

**Sesi**:
Satu percakapan Claude Code di dalam sebuah run; satu batch dikerjakan dalam satu sesi.
_Avoid_: run, thread

**Run terakhir proyek**:
Run paling baru di sebuah proyek; hanya run ini yang bisa dilanjut dengan mengetik bila statusnya Selesai.

**Baca saja**:
Run lama yang dibuka dari Riwayat: Chat, bukti, dan batch bisa dilihat, tidak bisa dijawab atau dilanjutkan.

**Batch**:
Sekelompok kecil item backlog (bawaan 5) yang dikerjakan dalam satu sesi lalu di-commit lokal.
_Avoid_: sprint, putaran

**Milestone**:
Kumpulan item satu scope (mis. "UI · 24 item") yang direview pemilik sebagai satu kesatuan.
_Avoid_: fase, sprint

**Usulan milestone**:
Batas milestone yang diajukan agent backlog dan menunggu Setujui pemilik sebelum batch pertamanya.

**Item**:
Satu pekerjaan di backlog proyek yang dikerjakan satu agent dan menghasilkan bukti.
_Avoid_: task, tiket

**Item perbaikan**:
Item baru yang lahir dari catatan Minta perbaikan pemilik saat review milestone.

**Item tambahan**:
Item yang masuk ke milestone setelah milestone itu mulai berjalan.

## Tim

**Tim**:
Sekumpulan agent dengan alur, perintah, jenis milestone, dan jenis bukti yang didefinisikan oleh plugin tim.
_Avoid_: crew (untuk arti ini), squad

**Agent**:
Anggota tim dengan peran, model, dan skill sendiri.

**Orkestrator**:
Sesi utama yang mengatur antrean dan memanggil agent; satu-satunya yang bisa bertanya ke pemilik.
_Avoid_: agent utama, master

**Di luar tim**:
Agent yang dipanggil dalam run tetapi tidak ada di definisi tim.

**Perintah tim**:
Cara memulai run yang disediakan tim (mis. Mulai dari ide, Lanjut backlog, Prompt bebas).

**Putaran**:
Berapa kali satu agent dijalankan dalam satu run.

## Tempat

**Proyek**:
Folder tempat run dimulai, di dalam folder kerja.
_Avoid_: repo, workspace

**Folder kerja**:
Folder teratas yang boleh dipakai Crew Control; tidak ada run di atasnya.
_Avoid_: root, workspace

**Sesi desktop**:
Sesi Claude Code yang pemilik buka sendiri di aplikasi desktop; bisa dijawab dan dihentikan, tidak bisa dikirimi prompt.

## Pemilik dan keputusan

**Butuh kamu**:
Keadaan saat ada pertanyaan, izin, usulan milestone, atau keputusan item yang menunggu pemilik.
_Avoid_: pending, perlu aksi

**Pertanyaan**:
Pesan agent di Chat yang meminta jawaban, dengan pilihan atau jawaban bebas.

**Izin**:
Permintaan agent untuk memakai alat yang tidak disetujui otomatis; dijawab Setujui, Tolak, atau Selalu setujui.
_Avoid_: approval

**Selalu setujui**:
Jawaban izin yang menyimpan aturan untuk proyek itu sehingga permintaan sejenis tidak ditanyakan lagi.

**Chat**:
Panel percakapan run: pesan agent, pertanyaan, izin, pesan sistem, dan pesan pemilik ke orkestrator.
_Avoid_: inbox, banner

**Pemberitahuan**:
Tanda bahwa pemilik dibutuhkan: judul tab, bunyi, notifikasi desktop, dan push ke HP.
_Avoid_: alert, alarm

## Hasil dan penilaian

**Bukti**:
Hasil yang bisa dilihat per item (gambar, mockup, diagram, grafik, hasil tes, ringkasan) beserta keterangan satu kalimat.
_Avoid_: artefak, evidence

**Kontrak bukti**:
Aturan yang wajib dipenuhi semua tim tentang jenis, format, dan lokasi bukti tiap item.

**Tanpa bukti**:
Item selesai yang tidak menyimpan bukti apa pun.

**Bukti hilang**:
Bukti yang tercatat tetapi berkasnya tidak ada lagi di folder proyek.

**Review milestone**:
Penilaian pemilik atas satu milestone dari galeri bukti, diakhiri Setujui atau Minta perbaikan.

**Kesehatan kit**:
Evaluasi lintas run tentang di mana kit boros token atau membuat pemilik menunggu, dibanding periode sebelumnya.

**Token**:
Ukuran pemakaian model yang dipakai di semua layar; satu definisi untuk semua angka.

**Waktu menunggu kamu**:
Lama dari pertanyaan atau izin masuk sampai dijawab pemilik.

**Revisi berulang**:
Item yang memerlukan item perbaikan atau diulang setelah gagal.

**Backlog melar**:
Pertambahan item setelah milestone mulai, dibanding jumlah item awalnya.

## Status run

**Jalan**: Run sedang dikerjakan.
**Dijeda**: Run ditahan pemilik setelah langkah yang sedang berjalan selesai.
**Jeda limit**: Run ditahan karena batas pemakaian langganan dan lanjut sendiri setelah jam reset.
**Siap review**: Milestone selesai dan menunggu review pemilik.
**Selesai**: Run berakhir normal.
**Dihentikan**: Run dihentikan pemilik dengan Stop.
**Gagal**: Run berhenti karena galat atau item gagal dua kali.
**Terputus**: Run berhenti karena server dashboard atau laptop mati saat run jalan.
_Avoid_: ready, rate limited, error

**Lanjut**:
Meneruskan run yang Dijeda di sesi yang sama.

**Lanjutkan**:
Membuka sesi baru di run yang sama setelah Gagal atau Terputus.
_Avoid_: resume, retry
