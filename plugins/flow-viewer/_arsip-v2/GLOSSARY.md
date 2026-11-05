# Glosarium Flow Viewer

Satu istilah, satu makna. Sumber: `docs/PRD.md` (v1.2, definisi mengikat di bagian 4a), `docs/UX.md`. Bahasa layar: Indonesia, sapaan "kamu".

## Proyek dan kerja

**Proyek**: folder tempat sesi Claude Code dimulai. Semua yang terjadi di sesi itu milik proyek ini, walau Claude berpindah ke subfolder. Sesi yang memang dimulai di subfolder menjadi proyek sendiri.
_Hindari_: workspace, repo.

**Proyek aktif**: proyek yang punya kejadian dalam 6 jam terakhir.

**Proyek tidak aktif**: proyek tanpa kejadian lebih dari 6 jam. Masih bisa dibuka dari Daftar proyek untuk membaca run terakhirnya; menjadi aktif lagi begitu ada kejadian baru.

**Sesi**: satu jendela Claude Code yang berjalan. Beberapa sesi di folder yang sama berbagi satu tampilan proyek; yang paling baru aktif menjadi run saat ini.

**Run**: satu putaran kerja dari prompt pemilik sampai Claude dan semua agent berhenti. Bisa berisi beberapa prompt bila run sedang Jeda.
_Hindari_: job, eksekusi.

**Flow**: urutan langkah yang dijalankan sebuah perintah (mis. build, start). Run tanpa perintah flow disebut "Tanpa flow".

**Langkah wajib**: agent yang harus jalan menurut flow. Tidak jalan sampai run selesai = Dilewati.

## Pelaku

**Agent**: anggota crew; satu node di grafik.

**Sesi utama**: Claude yang menerima prompt dan memanggil agent.
_Hindari_: orchestrator (di layar).

**Crew**: semua agent yang dikenal untuk proyek ini, tampil di grafik walau belum jalan.

**Di luar flow**: agent yang jalan tetapi bukan bagian dari flow run ini.

**Terdeklarasi**: model atau skill yang tertulis di definisi agent, yaitu yang seharusnya dipakai.

**Terbukti**: model atau skill yang benar-benar terlihat dipakai agent di run ini. Terdeklarasi yang belum terbukti, atau terbukti yang berbeda dari terdeklarasi, adalah tanda masalah.
_Hindari_: dipakai, aktif (tanpa keterangan terdeklarasi atau terbukti).

## Keadaan

**Status**: keadaan satu agent: Menunggu, Berjalan, Selesai, Dilewati, Butuh input, Gagal. Selalu ikon dan teks.

**Butuh input**: Claude atau agent menunggu jawaban, izin, atau keputusanmu, dan sudah memberi tanda resmi (pertanyaan berpilihan, permintaan izin, atau kabar "Claude menunggu" dari Claude Code). Satu-satunya istilah untuk keadaan ini.
_Hindari_: pending, menunggu kamu (sebagai nama status).

**Agent diam**: agent berstatus Berjalan yang tidak memberi kabar apa pun lebih dari 10 menit. Penanda, bukan status: statusnya tetap Berjalan, dan tidak ada bunyi atau notifikasi.
_Hindari_: macet, hang (untuk agent).

**Gagal**: agent berhenti karena error, atau item backlog ditandai gagal.

**Jeda (run)**: Claude berhenti tetapi run belum selesai: langkah wajib flow masih tersisa, atau pesan terakhirnya berupa pertanyaan biasa. Prompt berikutnya melanjutkan run yang sama. Jeda bukan Selesai dan bukan Butuh input: tidak ada Ringkasan run dan tidak ada pemberitahuan.
_Hindari_: pause, berhenti (untuk keadaan ini).

**Selesai (run)**: Claude dan semua agent berhenti tanpa menunggu kamu, tanpa langkah wajib tersisa, dan tanpa kegagalan yang belum diulang.

## Perhatian

**Pemberitahuan**: tanda bahwa kamu dibutuhkan atau ada kabar: judul tab, bunyi, notifikasi desktop, dan kotak di layar. Jenisnya: Pertanyaan, Izin, Keputusan backlog, Gagal, Selesai. Satu kejadian diberitahukan satu kali saja, walau halaman dimuat ulang atau dibuka di dua tab.

**Pertanyaan**: Claude atau agent bertanya lewat pertanyaan berpilihan, atau Claude Code mengabarkan Claude sedang menunggu. Dijawab di aplikasi Claude, bukan di viewer. Pertanyaan teks biasa baru menjadi Pertanyaan saat kabar "menunggu" itu datang (sekitar satu menit kemudian).

**Izin**: Claude meminta persetujuan memakai sebuah alat.

**Keputusan backlog**: item backlog berisi pertanyaan bisnis untukmu yang sudah siap diputuskan.

## Angka

**Progres**: seberapa jauh pekerjaan, dari backlog berbobot bila ada, kalau tidak dari langkah wajib flow. Item yang diparkir tidak dihitung.

**Token (setara input)**: perkiraan beban pemakaian model dengan satu bobot harga untuk semua model, bukan tagihan.

**Pembanding token**: run terbaru di proyek dan flow yang sama yang sudah punya angka token; untuk run tanpa flow, yang sama-sama memakai agent atau sama-sama tidak.

**Selisih token**: beda token run ini terhadap pembandingnya, dalam persen bertanda (`+12%`, `-8%`).

**Token boros**: run yang tokennya lebih dari 150% pembandingnya (selisih di atas +50%). Penanda, tanpa bunyi atau notifikasi. Tanpa pembanding, tidak ada penanda Boros.
_Hindari_: mahal (biaya tagihan bukan yang diukur).

## Hasil

**Ringkasan run**: satu layar hasil run yang Selesai atau Gagal (bukan Jeda): keputusan tersisa, langkah, token dan durasi, file berubah.

**Riwayat**: daftar run tersimpan per proyek; run lama hanya bisa dibaca.

**Run lama**: run dari Riwayat yang dibuka dengan tata letak live, hanya baca.

**Laporan token**: laporan satu proyek dari run tersimpannya: siapa dan apa yang paling banyak memakai token.
