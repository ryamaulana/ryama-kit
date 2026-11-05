# 0001: Batas run per prompt, dan Stop di tengah flow = jeda

Status: diterima (menunggu ya/tidak pemilik, KEPUTUSAN.md butir 1 dan 3) · 2026-10-27

## Konteks
1.7.1 hanya memulai run baru saat ada perintah flow atau Reset, sehingga satu "run" bisa memuat puluhan prompt. PRD v2 meminta Ringkasan run saat run selesai, pembanding token per run, dan pemberitahuan Selesai. Hook Claude Code tidak punya sinyal "pekerjaan selesai"; yang ada hanya `Stop` per giliran. Dari 73 Stop nyata, banyak yang terjadi saat agent latar masih jalan (`background_tasks`), 8 berakhir dengan pertanyaan, dan beberapa menunggu persetujuan tanpa tanda tanya.

## Keputusan
- Run baru dimulai oleh perintah flow, sesi baru di folder yang sama, atau prompt pemilik setelah run berfase selesai. Pesan sistem yang disuntik dan prompt saat run jeda melanjutkan run yang sama.
- Stop menjadi kandidat akhir hanya bila tidak ada agent berjalan dan `background_tasks` kosong, lalu diklasifikasikan setelah 2 dtk tanpa event: gagal, jeda (flow masih punya langkah wajib, atau pesan terakhir berakhir `?`), atau selesai.

## Alternatif ditolak
- Satu run per perintah flow (1.7.1): ringkasan dan pembanding tidak bermakna untuk kerja tanpa flow.
- Satu run per `prompt_id`: flow bertahap dengan persetujuan pemilik pecah menjadi banyak run.
- Klasifikasi isi pesan dengan model bahasa: menambah biaya dan dependensi.

## Konsekuensi
- Riwayat lebih banyak baris; prune 200 per proyek.
- Heuristik bisa salah untuk persetujuan tanpa tanda tanya di luar flow; diuji ulang dengan replay event nyata (T12) tiap aturan diubah.
