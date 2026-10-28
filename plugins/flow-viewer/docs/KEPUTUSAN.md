# Keputusan arsitektur Flow Viewer v2 (untuk pemilik)

Rincian teknis: `docs/ARCHITECTURE.md`. Urutan kerja: `docs/TASKS.md`.

## Keputusan utama

| Hal | Pilihan | Alternatif yang ditolak | Alasan | Biaya dan beban kerja kasar | Risiko |
|---|---|---|---|---|---|
| Stack | Node bawaan + HTML/JS biasa, dipecah jadi ±20 file kecil (bukan satu file 188 KB) | React/Vite (kerangka tampilan dengan langkah build) | PRD melarang dependensi baru; plugin langsung jalan dari folder tanpa build | Rp0. Kerja terbesar: menulis ulang tampilan (±60% dari total) | Kode tampilan lebih panjang tanpa kerangka; diimbangi modul kecil yang bisa diuji |
| Tempat jalan | Laptop sendiri, satu server di `localhost:4777`, dinyalakan otomatis saat Claude Code mulai | Server bersama atau cloud | PRD: lokal, satu pemilik | Rp0, tanpa hosting | Server mati bila semua sesi Claude ditutup lama; cukup jalankan `/flow-viewer:flow` |
| Pemisahan proyek | Proyek = folder tempat sesi Claude dimulai; event berikutnya dari sesi yang sama tetap ikut proyek itu walau Claude pindah ke subfolder | Mengikuti folder di tiap event (cara 1.7.1) | Log nyata menunjukkan 281 event dari subfolder (`docs/mockups`) yang akan menjadi "proyek" palsu | Termasuk tugas server | Sesi yang dimulai di subfolder dianggap proyek sendiri |
| Penyimpanan | Riwayat tetap SQLite di `~/.claude/flow-viewer` (di luar repo), 200 run per proyek | Database server, atau file di folder proyek | Sudah jalan; tidak ikut ter-commit | Rp0; tanpa migrasi data lama | Disk: log kejadian sekarang 85 MB, akan dibatasi 20 MB |
| Akses | Tanpa login; server hanya menerima koneksi dari laptop ini | Login atau token | PRD: satu orang, lokal | Rp0 | Siapa pun yang memakai akun laptop yang sama bisa membuka viewer (sama seperti file lainnya) |
| Keamanan | Tolak permintaan dari situs lain (pemeriksaan alamat asal), semua teks agent ditampilkan sebagai teks biasa (bukan kode), server hanya membaca file transkrip Claude dan backlog proyek | Tanpa pemeriksaan (1.7.1) | Situs jahat yang kebetulan terbuka di browser bisa membaca percakapan atau memalsukan notifikasi di 1.7.1 | ±1 hari kerja agent | Kecil setelah uji keamanan (T11, T29) |
| Pemberitahuan | Judul tab, bunyi pendek buatan browser, notifikasi desktop setelah tombol "Aktifkan" | Aplikasi notifikasi terpisah | Cukup dari browser; tanpa instalasi | Rp0 | Tidak ada tab viewer terbuka = tidak ada pemberitahuan (batas browser, sudah di PRD) |

## Asumsi
- Satu run = dari prompt kamu sampai Claude dan semua agent berhenti. Prompt baru setelah run selesai = run baru (1.7.1 hanya memulai run baru saat ada perintah flow).
- "Butuh input" juga dipakai bila Claude berhenti di tengah flow yang langkah wajibnya belum jalan, atau pesan terakhirnya berupa pertanyaan.
- Notifikasi "Claude menunggu input" yang muncul tiap 60 detik setelah Claude diam tidak dihitung, agar Selesai tidak berbunyi dua kali.
- Agent baru di folder agent proyek muncul di grafik pada sesi berikutnya; agent pribadi di `~/.claude/agents` hanya muncul bila jalan.

## Risiko utama
1. **Selesai terlalu cepat.** Claude kadang berhenti di tengah pekerjaan bertahap sambil menunggu persetujuanmu tanpa tanda tanya. Di luar flow, viewer akan menyebutnya Selesai. Diuji dengan 73 kejadian berhenti nyata sebelum tampilan dibangun (T12).
2. **Server diganti saat dikembangkan.** Run yang sedang jalan kehilangan konteks flow bila server diperbarui di tengah jalan; pemulihan dijadwalkan sebagai tugas opsional T31.
3. **Dua sesi di folder sama.** Hanya sesi terbaru yang tampil; pertanyaan dan izin dari sesi lama tetap muncul agar tidak terlewat, aktivitas lainnya tidak.

## Biaya
Nol rupiah: semua lokal, tanpa layanan, langganan, atau dependensi. Beban hanya waktu kerja agent (31 tugas; jalur terpanjang 15 tugas).

## Perlu jawabanmu (ya/tidak)
1. **Prompt baru setelah run selesai dihitung sebagai run baru** (Riwayat jadi lebih banyak baris, ringkasan dan pembanding token per prompt). Rekomendasi: **ya**. Bila tidak, run hanya berganti saat ada perintah flow seperti 1.7.1, dan Ringkasan run hanya muncul sekali per flow.
2. **Riwayat menyimpan 200 run per proyek** (bukan 200 untuk semua proyek). Rekomendasi: **ya**, agar proyek yang ramai tidak menghapus riwayat proyek lain.
3. **Claude berhenti dengan pertanyaan atau di tengah flow ditandai "Butuh input", bukan "Selesai"**, sehingga Ringkasan run tidak muncul dan judul tab menyebut Butuh input. Rekomendasi: **ya**.
