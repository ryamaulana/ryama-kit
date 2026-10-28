---
name: project-context
description: Aturan konteks proyek untuk semua agent kit - cara mencari PRD yang mungkin sudah ada di mana saja, peran pemilik (ide, jawaban PRD, referensi, penilaian arah) dan apa yang diputuskan agent sendiri. Wajib dibaca di awal tugas.
---

# Konteks proyek dan peran pemilik

## 1. Cari PRD dulu, jangan berasumsi

Jangan langsung memakai `docs/PRD.md` atau membuat PRD baru. Urutan:

1. `docs/PROJECT.md`, kalau ada, memuat baris `PRD: <path>`. Pakai itu dan jangan mencari lagi.
2. Path yang disebut pemilik di prompt atau di `CLAUDE.md`.
3. Lokasi umum: `docs/PRD.md`, `PRD.md`, `docs/prd.md`, `docs/product/prd.md`, `docs/spec*.md`, `README` yang berisi bagian kebutuhan produk.
4. Cari dengan Glob: `**/*[pP][rR][dD]*.md`, `**/*spec*.md`, `**/*brief*.md`, `**/*requirement*.md`. Abaikan `node_modules`, `.git`, `dist`, `build`, folder arsip, dan `_to_delete`. Kalau sesi punya tool Projects atau knowledge, cek juga di sana.
5. Beberapa kandidat: pilih yang paling lengkap dan terbaru, sebut ke pemilik dalam satu baris ("Memakai PRD: <path>"), jangan menulis ke yang lain.
6. Tidak ada sama sekali: katakan itu dan jalankan agent `prd`. PRD baru ditulis ke `docs/PRD.md`.

Setelah ketemu, tulis atau perbarui `docs/PROJECT.md` (maks 10 baris): `PRD: <path>`, jenis proyek (default web), stack bila sudah diketahui, bahasa antarmuka, tahap terakhir yang selesai (prd, ux, desain, arsitektur, build). Agent berikutnya membaca file ini dulu.

## 2. Peran pemilik

Pemilik adalah orang bisnis yang paham pengembangan. Ia:
- memberi ide, menjawab pertanyaan PRD, dan memberi referensi desain;
- menilai apakah arahnya sudah sesuai;
- menyerahkan alur UX, desain, stack, dan keamanan kepada agent.

Karena itu agent:
- **Memutuskan sendiri** hal UX (langkah, pola modal atau panel, navigasi, state), teknis (stack, struktur, API), dan keamanan. Catat alasannya satu baris di dokumen yang relevan.
- **Tidak bertanya** soal state, teori UX, pilihan library, atau detail teknis. Kalau ragu, pilih default yang aman dan catat sebagai asumsi.
- **Bertanya hanya** hal bisnis: tujuan, siapa penggunanya, prioritas, batasan biaya dan waktu, selera (lewat referensi). Maksimal 4 pertanyaan sekali tanya, pakai pilihan dengan satu opsi "(rekomendasi)".
- **Meminta persetujuan** di titik arah (ringkasan UX, arah desain, ringkasan keputusan arsitektur), bukan di tiap langkah.

## 3. Cara melapor ke pemilik

- Bahasa Indonesia, ringkas, hasil dulu, lalu bukti (angka, path screenshot, hasil audit). Tanpa rekap langkah.
- Istilah teknis hanya bila perlu, dengan penjelasan satu frasa.
- Selalu sebut: apa yang selesai, apa yang belum atau dilewati, dan satu langkah berikutnya.
- Jangan menyatakan selesai tanpa bukti (audit, screenshot, tes).

## 4. Bahasa UI

Bahasa teks di layar (bukan bahasa percakapan dengan pemilik, yang tetap Indonesia) ditentukan sekali, dalam urutan ini: baris `Bahasa UI: id|en` di `docs/PROJECT.md`; bahasa yang tertulis di PRD; bahasa PRD itu sendiri. Proyek dua bahasa: tulis bahasa utamanya dan catat sebagai pertanyaan, jangan mencampur dalam satu layar. Simpan hasilnya di `docs/PROJECT.md` sebagai `Bahasa UI: id` atau `en`. Pilih skill teks sesuai bahasa: `ux-writing-id` untuk Indonesia, `ux-writing-en` untuk Inggris (keduanya menambah `ux-writing`). Audit `ui-craft` dijalankan dengan `--lang id|en`.

## 5. Umum untuk semua proyek

- Kit ini berfokus pada **web**. Kalau proyek bukan web (mobile, ML, IoT, CLI), katakan sekali di awal bahwa agent visual dan QA-nya web-fokus, lalu lanjut sebisanya.
- Jangan membawa nama produk, palet, atau istilah dari proyek lain. Semua datang dari PRD, referensi pemilik, dan dokumen proyek ini.
- Jika dokumen bertentangan, urutan menang: PRD (tujuan dan kriteria), UX (alur), DESIGN (visual), ARCHITECTURE (teknis). Sebutkan konfliknya ke pemilik.
- Jangan menambah fitur di luar PRD (mis. login sosial yang tidak diminta).
