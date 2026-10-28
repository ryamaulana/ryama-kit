# Glosarium Flow Viewer

Satu istilah, satu makna. Sumber: `docs/PRD.md`, `docs/UX.md`. Bahasa layar: Indonesia, sapaan "kamu".

## Proyek dan kerja

**Proyek**: folder tempat sesi Claude Code dimulai. Semua yang terjadi di sesi itu milik proyek ini, walau Claude berpindah ke subfolder.
_Hindari_: workspace, repo.

**Proyek aktif**: proyek yang punya kejadian dalam 6 jam terakhir. Proyek lain hanya terlihat lewat Riwayat.

**Sesi**: satu jendela Claude Code yang berjalan. Beberapa sesi di folder yang sama berbagi satu tampilan proyek; yang paling baru aktif menjadi run saat ini.

**Run**: satu putaran kerja dari prompt pemilik sampai Claude dan semua agent berhenti. Bisa berisi beberapa prompt bila Claude berhenti untuk menunggu balasanmu.
_Hindari_: job, eksekusi.

**Flow**: urutan langkah yang dijalankan sebuah perintah (mis. build, start). Run tanpa perintah flow disebut "Tanpa flow".

**Langkah wajib**: agent yang harus jalan menurut flow. Tidak jalan sampai run selesai = Dilewati.

## Pelaku

**Agent**: anggota crew; satu node di grafik.

**Sesi utama**: Claude yang menerima prompt dan memanggil agent.
_Hindari_: orchestrator (di layar).

**Crew**: semua agent yang dikenal untuk proyek ini, tampil di grafik walau belum jalan.

**Di luar flow**: agent yang jalan tetapi bukan bagian dari flow run ini.

## Keadaan

**Status**: keadaan satu agent: Menunggu, Berjalan, Selesai, Dilewati, Butuh input, Gagal. Selalu ikon dan teks.

**Butuh input**: Claude atau agent menunggu jawaban, izin, atau keputusanmu. Satu-satunya istilah untuk keadaan ini.
_Hindari_: pending, menunggu kamu (sebagai nama status).

**Gagal**: agent berhenti karena error, atau item backlog ditandai gagal.

**Selesai (run)**: Claude dan semua agent berhenti tanpa menunggu kamu.

## Perhatian

**Pemberitahuan**: tanda bahwa kamu dibutuhkan atau ada kabar: judul tab, bunyi, notifikasi desktop, dan kotak di layar. Jenisnya: Pertanyaan, Izin, Keputusan backlog, Gagal, Selesai.

**Pertanyaan**: Claude atau agent bertanya, dengan atau tanpa pilihan jawaban. Dijawab di aplikasi Claude, bukan di viewer.

**Izin**: Claude meminta persetujuan memakai sebuah alat.

**Keputusan backlog**: item backlog berisi pertanyaan bisnis untukmu yang sudah siap diputuskan.

## Angka

**Progres**: seberapa jauh pekerjaan, dari backlog berbobot bila ada, kalau tidak dari langkah wajib flow. Item yang diparkir tidak dihitung.

**Token (setara input)**: perkiraan beban pemakaian model, bukan tagihan.

**Pembanding token**: run sebelumnya di proyek dan flow yang sama.

## Hasil

**Ringkasan run**: satu layar hasil run yang selesai: keputusan tersisa, langkah, token dan durasi, file berubah.

**Riwayat**: daftar run tersimpan per proyek; run lama hanya bisa dibaca.

**Run lama**: run dari Riwayat yang dibuka dengan tata letak live, hanya baca.
