# Data mockup Layar proyek (dipakai ketiga arah)

Sumber: `data/crew.db`, run `ced3b44a` (07_Sandbox), dibaca 2026-11-04. Waktu dikonversi ke WIB (UTC+7). Token memakai definisi UX U2: input + output + cache tulis; cache baca di keterangan.

## 1. Run asli 07_Sandbox (prompt bebas, tanpa milestone)
- Proyek: `07_Sandbox` · path relatif `01_Workspace › 07_Sandbox` · tim Fullstack · model orkestrator Haiku · asal dashboard.
- Prompt pertama: "Ini tes Crew Control. Buat folder crew-tes dan kerja di dalamnya saja. Sebelum mulai, tanya saya dulu pakai pilihan ganda: warna apa untuk file warna.txt (Merah, Biru, Hijau). Setelah saya jawab, tulis warna itu ke crew-tes/warna.txt. Lalu coba tulis file ke ../../luar-tes.txt."
- Token akhir: 1.186 (input 2, output 114, cache tulis 1.070) -> "1,2 rb"; cache baca 49.701 -> "49,7 rb" di keterangan. Durasi 2 mnt 9 dtk.
- Agent tim: hanya orkestrator yang bekerja; 10 agent tim berstatus Siap (tidak dipanggil). Prompt bebas = tanpa batch dan milestone (PRD F3 edge case), jadi bar atas menampilkan "Prompt bebas" dan jumlah langkah, bukan "x/y item".

| WIB | Kejadian | Isi asli |
|---|---|---|
| 14.37.15 | Run jalan | prompt di atas |
| 14.37.22 | Langkah AskUserQuestion; **Pertanyaan** (status Butuh kamu, 1 menunggu) | "Warna apa untuk file warna.txt?" Pilihan: Merah ("Tulis "Merah" ke crew-tes/warna.txt"), Biru, Hijau |
| 14.37.33 | Dijawab dari dashboard | Biru (11 dtk menunggu) |
| 14.37.36 | Langkah | Bash `mkdir -p crew-tes && ls -ld crew-tes`; Write `D:\01_Workspace\07_Sandbox\crew-tes\warna.txt` |
| 14.37.39 | **Izin** (Butuh kamu, 1 menunggu) | "Izin untuk Write" · `D:\luar-tes.txt` · alasan ditanya: "Path di luar folder proyek: D:\luar-tes.txt" |
| 14.37.54 | Ditolak dari dashboard | alasan: "Jangan tulis di luar folder proyek. Selesai saja." |
| 14.37.57 | Pesan agent | "Folder `crew-tes` sudah dibuat dan `crew-tes/warna.txt` berisi `Biru`. Penulisan ke `../../luar-tes.txt` ditolak dengan pesan "Jangan tulis di luar folder proyek. Selesai saja." Saya tidak mencoba jalan lain, dan tidak ada file yang ditulis di luar `crew-tes`." |
| 14.38.00 | Sistem | "Run selesai." |
| 14.38.12 | Pesan pemilik (lanjut obrolan, F5) | "Di crew-tes: tulis a.txt, lalu jalankan ping -n 20 127.0.0.1, lalu tulis b.txt, lalu c.txt. Satu per satu." |
| 14.38.15-18 | Langkah | Write `a.txt`; Bash `ping -n 20 127.0.0.1` |
| 14.38.25 | **Dijeda** | run status paused |
| 14.38.58 | Lanjut | Write `b.txt` (14.38.39 sebelum jeda berlaku), Write `c.txt` 14.39.00 |
| 14.39.01 | Pesan agent | "Selesai, berurutan, semua di `crew-tes`: 1. `a.txt` dibuat. 2. `ping -n 20 127.0.0.1` jalan: 20 dari 20 paket diterima, 0% loss. 3. `b.txt` dibuat. 4. `c.txt` dibuat." |
| 14.39.04 | Sistem | "Run selesai." |
| 14.39.08 | Pesan pemilik | "Jalankan ping -n 60 127.0.0.1 lalu tulis d.txt di crew-tes." |
| 14.39.11 | Langkah | Bash `ping -n 60 127.0.0.1` |
| 14.39.24 | **Stop** | status Dihentikan, alasan "Dihentikan oleh pemilik." |

Empat keadaan yang dimockup dari run ini: (a) 14.37.22 pertanyaan terbuka, (b) 14.37.39 izin terbuka, (c) 14.38.25 dijeda, (d) 14.39.24 dihentikan (akhir).

## 2. Keadaan berat (DATA CONTOH, bukan run asli; diminta pemilik)
Label wajib di mockup: "Data contoh". Nama agent dari plugin `fullstack-dev` + `ui-designer-kit` (model dari frontmatter agent).
- Proyek `toconnect` · `clients › toconnect` · perintah Lanjut backlog · orkestrator Sonnet.
- Milestone `UI · 7/24 item` · batch 2 · token 412,6 rb · durasi 1 j 48 mnt · 1 menunggu kamu.
- Agent (10), urutan kolom kiri menurut UX 6.2:

| Agent | Model | Status | Isi baris |
|---|---|---|---|
| ui-designer | opus | Butuh kamu | pertanyaan diteruskan orkestrator (A8) |
| fe | sonnet | Jalan · putaran 3 | item "Kerangka layar Riwayat" |
| be | sonnet | Jalan · putaran 2 | item "Paginasi daftar run" |
| prd, ux, architect, backlog | opus/opus/opus/sonnet | Selesai | |
| ui-critic, qa, cyber | opus/sonnet/sonnet | Siap | |

- Pertanyaan (dari orkestrator, label "dari ui-designer"): "Kartu bukti yang tidak punya gambar: tampilkan apa?" Pilihan: "Ringkasan teks", "Ikon jenis berkas", "Keduanya".
- Langkah paralel terakhir (untuk baris langkah alat): fe "Write web/src/riwayat/RiwayatList.tsx", be "Bash npm test -- runs".

## 3. Total yang harus cocok di layar (uji total, dashboard-design qa)
- Sandbox akhir: status Dihentikan · 1,2 rb token · 2 mnt 9 dtk · 0 menunggu · 9 langkah alat (8 setelah AskUserQuestion dikeluarkan dari hitungan, karena pertanyaan tampil sebagai kartu).
- Berat: 2 Jalan + 1 Butuh kamu + 4 Selesai + 3 Siap = 10 agent; 7 dari 24 item; lencana Chat = 1.

## 4. Daftar proyek (DATA CONTOH kecuali 07_Sandbox; momen yang sama dengan keadaan berat, 5 Nov 10.48)
Batas run bersamaan (`maxRuns`) = 3 (asumsi contoh). Jeda limit tidak dihitung sebagai Jalan.

| Proyek | Path | Kelompok | Status | Milestone | Rincian | Terakhir |
|---|---|---|---|---|---|---|
| toconnect | clients › toconnect | Perlu diurus | Butuh kamu (1 pertanyaan dari ui-designer, sejak 10.42) | UI · 7/24 item · batch 2 (2 dikerjakan) | fe, be jalan · 412,6 rb token · 1 j 48 mnt | 10.42 |
| ryama-kit | ryama-kit | Perlu diurus | Siap review | Rilis 0.9 · 12/12 item | 238,1 rb token · 3 j 05 mnt | 09.57 |
| absensi-cabang | clients › absensi-cabang | Perlu diurus | Gagal (item 5 "Rekap per cabang", putaran 3) | Inti · 4/9 item | 96,4 rb token · 41 mnt | 09.15 |
| crew-control | ryama-kit › plugins › crew-control | Jalan | Jalan (be putaran 1) | Server · 3/10 item · batch 1 (1 dikerjakan) | 54,0 rb token · 22 mnt | 10.47 |
| katalog-toko | clients › katalog-toko | Jalan | Jeda limit, lanjut sendiri 17.00 | Katalog · 5/8 item | 181,7 rb token · 1 j 12 mnt | 10.05 |
| flow-viewer | ryama-kit › plugins › flow-viewer | Diam | Selesai · dari desktop | Prompt bebas · 31 langkah | 77,9 rb token · 26 mnt | Kemarin 16.20 |
| 07_Sandbox | 07_Sandbox | Diam | Dihentikan (asli) | Prompt bebas · 9 langkah | 1,2 rb token · 2 mnt 9 dtk | Kemarin 14.39 |
| absensi-lama | clients › arsip › absensi-lama | Diam | Selesai | Inti · 6/6 item | 140,3 rb token · 2 j 10 mnt | 2 Nov |

Total yang harus cocok: Butuh kamu 1 (= lencana rel) · Siap review 1 · Jalan 2/3 (toconnect, crew-control) · Gagal atau terputus 1 · Jeda limit 1, reset 17.00 · 8 proyek (3 perlu diurus, 2 jalan, 3 diam). Setelah [Lanjutkan] pada absensi-cabang: Gagal 0 (diciutkan), Jalan 3/3, absensi-cabang pindah ke Jalan.
