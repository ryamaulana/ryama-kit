---
description: "Satu pintu dari ide sampai build dengan titik persetujuan. Usage: /fullstack-dev:start <ide, atau lanjutkan proyek yang ada> [referensi desain]"
argument-hint: "<ide produk atau 'lanjut'> [URL/screenshot referensi]"
---

Dari pemilik: $ARGUMENTS

Pemilik adalah orang bisnis yang paham pengembangan. Ia hanya memberi ide, menjawab pertanyaan PRD, memberi referensi desain, dan menilai arah. UX, desain teknis, stack, dan keamanan kamu serahkan ke subagent. Baca skill `project-context` dan ikuti aturannya (jangan bertanya soal teknis, UX, atau state; laporan Indonesia, hasil dulu).

Delegasikan ke subagent dengan scope dan catatan saja, bukan riwayat chat; mereka membaca dokumen sendiri.

**Aturan delegasi (kurir, bukan desainer).** Ke `ui-designer`, `ux`, atau `ui-critic` kirim hanya: (1) kata-kata pemilik apa adanya (kutip, jangan diringkas jadi arahan), (2) path dokumen yang relevan, (3) lingkup (layar/folder, Tahap A/B, jumlah arah). JANGAN menulis keputusan visual (gaya, warna, font, layout, ilustrasi, bentuk atau jumlah section) dan JANGAN menyuruh melewati langkah atau dokumen agent itu (DESIGN.md, konsep, rancangan, audit). Kalau pemilik ingin cepat, sampaikan apa adanya; agent yang menyesuaikan.
 Setiap tahap hanya dijalankan kalau hasilnya belum ada, jadi perintah ini juga dipakai untuk melanjutkan. Semua tahap berikut wajib, tidak boleh dilewati atas inisiatif sendiri. Setelah tahap 5 proyek berpindah ke `/fullstack-dev:run` dan `/fullstack-dev:backlog` untuk sesi-sesi berikutnya.

0. **Konteks.** Cari PRD, `docs/UX.md`, `docs/DESIGN.md` (status), `docs/ARCHITECTURE.md`, `docs/KEPUTUSAN.md`, `docs/PROJECT.md`. Tulis satu baris: dokumen apa yang ditemukan dan dari tahap mana kita mulai. Jenis proyek bukan web: sebut sekali bahwa agent visual dan QA web-fokus.
1. **PRD** (`prd`). Tidak ada PRD: wawancarai pemilik (pertanyaan bisnis saja). Ada: pakai, sebutkan path-nya. Pemilik tidak perlu diminta mengaudit.
2. **UX** (`ux`) -> `docs/UX.md`. Tampilkan *Ringkasan untuk pemilik* dan tanya lewat AskUserQuestion: Setuju / Ubah (dengan catatan). Ubah: kirim catatan ke `ux`, maksimal 2 putaran.
3. **Arah desain.** Belum ada `docs/DESIGN.md` berstatus Approved: jalankan alur `/fullstack-dev:ui-direction` (tanya kesan 3 kata, referensi, dan hal yang tidak disukai; tiga konsep untuk seluruh produk diuji pada satu layar kunci; pemilik memilih satu; arah terpilih dilengkapi satu layar per jenis layar (tugas, dashboard, pemasaran) lalu dinilai kritikus). Referensi desain ditanyakan SEBELUM desainer jalan. Hanya Tahap A (token, sheet komponen, layar inti (alur utama, tanpa batas angka)) yang dibuat sebelum persetujuan; layar sisanya baru dibuat setelah arah disetujui (jadi item backlog). Pemilik mengganti arah di tengah jalan: ulangi Tahap A saja, bukan semua layar. Sudah ada Approved: jangan mengubah gaya. Ide "bikin baru" tidak mengganti token yang sudah disetujui.
4. **Arsitektur** (`architect`) -> `docs/ARCHITECTURE.md`, `docs/KEPUTUSAN.md` (tanpa TASKS.md; pemecahan kerja dilakukan agent `backlog`). Tampilkan ringkasan keputusan (stack, hosting, keamanan, biaya, risiko) dan minta persetujuan lewat AskUserQuestion.
5. **Backlog** (`backlog`) -> `docs/backlog.json` dan `docs/BACKLOG.md`. Urutan kerja berdependensi (layar B setelah layar A), dengan item kritikus, QA, dan cyber yang wajib ada. Tampilkan progres dan batch pertama, lalu minta persetujuan lewat AskUserQuestion.
6. **Build** lewat alur `/fullstack-dev:run` (satu agent per item dengan paket konteks; kritikus, QA, dan cyber berjalan karena mereka item di backlog, bukan karena orkestrator ingat). Berhenti di titik keputusan pemilik atau setelah 5 item; lanjutkan dengan `/fullstack-dev:run`.
7. **Laporan pemilik** (Indonesia, ringkas). Tabel kriteria PRD: sesuai atau belum, dengan bukti (path screenshot, hasil tes, angka audit). Lalu: agent yang benar-benar dipanggil, yang dilewati dan alasannya, masalah terbuka, satu langkah berikutnya.

Jangan menambah fitur di luar PRD. Jangan menulis ulang dokumen yang sudah disetujui kecuali pemilik minta.
