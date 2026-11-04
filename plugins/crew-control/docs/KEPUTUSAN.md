# Keputusan Crew Control

Status: arsitektur penuh, 2026-11-04. Rincian teknis: `docs/ARCHITECTURE.md`. Bukti spike dan irisan tipis (dulu di dokumen ini): `docs/SPIKE.md`.

## Spike (ringkas)
- **A1 kebijakan login: boleh.** Program `claude` asli dengan langganan Anda, untuk pemakaian sendiri, diizinkan dokumen resmi Anthropic. Syarat: bukan Agent SDK, token login tidak disentuh, tanpa `--bare`.
- **A2 kemampuan teknis: terbukti** (jawab pertanyaan, Setujui/Tolak, pesan ke sesi jalan, Jeda/Lanjut, Stop ~2 detik). Sesi aplikasi desktop baru terbukti lewat simulasi.

## Keputusan utama

| Topik | Pilihan | Alternatif yang ditolak | Alasan | Biaya dan beban kerja kasar | Risiko |
|---|---|---|---|---|---|
| Teknologi | Node.js + TypeScript di server; React (pustaka tampilan) di browser; SQLite (database satu berkas) | Membuat ulang dari nol; tetap HTML polos | Irisan tipis (50 tes lulus) dipakai terus; React perlu untuk 7 layar live dan peta jalur | Rp0 lisensi. Kerja terbesar: tampilan 7 layar dan pengatur batch | Rendah: semua sudah jalan di laptop ini |
| Cara mengendalikan agent | Dashboard menyalakan program `claude` asli dan menjadi "tuan rumah izin" | Agent SDK (kerangka pembuat agent) | SDK mewajibkan API key berbayar per token; program asli boleh dengan langganan | Tetap langganan Pro Anda | Anthropic bisa mengubah aturan atau format; dikurung di satu modul |
| Siapa yang mengatur batch | Dashboard membaca berkas backlog sebelum dan sesudah tiap batch, lalu commit sendiri | Orkestrator memutuskan sendiri lewat percakapan | Hasil bisa dihitung pasti; pertanyaan keputusan tidak menahan item lain | Perlu ubah kecil di kit Fullstack (mode `--crew`, kolom milestone di backlog) | Kit dan dashboard harus seirama; cara manual lama tetap jalan |
| Tempat jalan (hosting) | Laptop Windows Anda. HP lewat `tailscale serve` (jalur HTTPS khusus jaringan Tailscale Anda) | Server sewaan; membuka port ke internet | Data tetap lokal; HTTPS wajib untuk push dan pemasangan di HP | Rp0. Tailscale gratis untuk pemakaian pribadi | Laptop tidur = run Terputus (A6) |
| Akses dan "login" | Tanpa akun. Hanya laptop sendiri dan perangkat di Tailscale Anda; bisa dikunci ke akun Tailscale Anda | Kata sandi atau akun | Satu pengguna; jaringan pribadi sudah jadi pintu | Tanpa beban | Siapa pun yang memegang HP Anda yang tidak terkunci bisa memberi izin |
| Penyimpanan data | Satu berkas database di `data/` laptop (tidak masuk git). Bukti tetap di folder proyek | Database server; menyimpan salinan bukti | Sederhana, tanpa instalasi; bukti ikut commit proyek | Tanpa biaya | Berkas bukti yang dihapus dari proyek tampil "hilang" |
| Pendekatan keamanan | Hanya alamat lokal dan Tailscale; tolak permintaan dari halaman web lain; izin otomatis hanya di dalam folder proyek; "Selalu setujui" tidak berlaku untuk perintah berisiko; commit otomatis menolak berkas rahasia (`.env`, kunci) | Percaya semua yang datang dari laptop | Dashboard ini bisa menjalankan perintah di laptop; salah akses = laptop diubah orang lain | Termasuk di pekerjaan server; diperiksa agent `cyber` | Aturan perintah memakai pola teks, bukan pemahaman penuh; cukup untuk laptop pribadi |
| Pemberitahuan | Judul tab + bunyi + notifikasi desktop di laptop; push ke HP lewat layanan push browser | Bot Telegram/WhatsApp | Tanpa akun pihak ketiga; sesuai PRD (aplikasi web terpasang di HP) | Rp0 | Notifikasi "sudah dijawab" kadang meninggalkan pesan umum di Chrome |

## Jawaban pemilik (2026-11-04): ya untuk ketiganya
1. **Mulai dengan 1 run aktif sekaligus** (langganan Pro; PRD Q3). `CREW_MAX_RUNS` bawaan 1, bisa dinaikkan sampai 3 setelah pemakaian 1-2 minggu diukur. Dijadwalkan di backlog: `rb03a-conductor-inti`.
2. **Uji tangan sesi desktop 2 menit** setelah fitur sesi desktop dibangun: buka sesi di aplikasi desktop, setujui satu izin dari dashboard. Syarat lulus F10. Dijadwalkan: item `dd07-uji-tangan-desktop` (menunggu Anda).
3. **Matikan Flow Viewer saat Crew Control dipakai** (hook-nya ikut menyala di setiap sesi dan menggandakan catatan; port 4777 dibiarkan). Dijadwalkan: item `dd06-matikan-flow-viewer` (tindakan Anda sebelum uji tangan).
