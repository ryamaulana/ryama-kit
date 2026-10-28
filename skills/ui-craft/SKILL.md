---
name: ui-craft
description: Aturan eksekusi UI yang berlaku untuk gaya apa pun (tipografi, spasi, warna, komponen, state, motion, aksesibilitas) beserta skrip audit yang mengukur halaman. Dipakai ui-designer sebelum menyerahkan hasil dan ui-critic sebagai bukti terukur.
---

# UI craft: kualitas eksekusi, apa pun gayanya

Gaya (minimalis, brutal, lembut, editorial) menentukan **nilai**: font, warna, radius. Craft menentukan apakah nilai-nilai itu **dipakai dengan disiplin**. Aturan di bawah berlaku untuk semua gaya. Pemilik produk tidak perlu tahu aturannya; agent yang bertanggung jawab.

**Audit = perintilan, bukan penilai arah.** Skrip audit mengukur hal yang bisa dihitung (kontras, ukuran, overflow, kepatuhan token, jumlah font/aksen/kartu). Ia tidak tahu apakah hierarki, titik fokus, atau kesan sudah benar. Itu dirancang SEBELUM membangun (Rancangan layar di DESIGN.md, skill `design-principles`) dan dinilai `ui-critic` terhadap rancangan itu. Lulus audit tidak berarti desainnya bagus.

## 1. Cara pakai

**Designer:**
1. Sebelum menulis kode, tulis token ke `docs/design-tokens.css` (custom properties: peran warna, skala huruf, skala spasi, 2-3 radius, maksimal 3 tingkat bayangan, font) dan ringkasannya di `docs/DESIGN.md`. Semua halaman hanya memakai `var(--...)` dari file itu; audit dengan `--tokens` menandai nilai di luar token.
2. Setelah halaman jadi (bukan di tengah pembangunan), jalankan audit sekali (bagian 4); kumpulkan semua temuan dan perbaiki dalam satu putaran, lalu jalankan ulang sekali sebagai bukti. Perbaiki semua temuan **tinggi** dan **sedang** sebelum menyerahkan. Temuan yang sengaja dilanggar ditulis di `DESIGN.md` bagian "Pelanggaran disengaja" dengan alasannya (contoh: angka skor 200px yang dekoratif). Selain itu dianggap cacat.

**Critic:** pakai `docs/screenshots/audit.json` dari desainer; jalankan ulang hanya bila tidak ada atau lebih tua dari file layar. Angka audit adalah bukti. Baru setelah itu beri penilaian visual berdasarkan skill `design-principles`. Jangan menyebut sesuatu "bagus" tanpa audit lulus.

**Syarat lulus:** 0 temuan tinggi, 0 nilai di luar token (bila `--tokens` dipakai), temuan sedang diperbaiki atau dibenarkan tertulis, dan critic tidak memberi verdict GENERIC.

## 2. Aturan dengan angka (nilai bawaan jika DESIGN.md belum menentukan)

**Tipografi**
- Skala huruf satu keluarga rasio 1.2-1.33, maksimal 6-8 ukuran dipakai. Teks isi 16px (padat: 14-15px). Tidak ada teks di bawah 12px.
- Line-height teks isi 1.5-1.65; judul besar 1.1-1.25. Panjang baris 45-75 karakter.
- Maksimal 2 keluarga huruf, 3 bobot. Angka di tabel dan skor pakai tabular-nums. Judul besar boleh letter-spacing negatif; teks kecil huruf kapital diberi letter-spacing positif.
- `text-wrap: balance` untuk judul; cek tidak ada satu kata menggantung di baris terakhir.

**Spasi dan layout**
- Satu skala kelipatan 4 (4, 8, 12, 16, 24, 32, 48, 64, 96). Tidak ada nilai di luar skala kecuali dibenarkan.
- Kedekatan: jarak di dalam grup 8-12, antar grup 24-48, antar seksi 64-96 (desktop), 40-56 (mobile).
- Lebar konten maksimum 1120-1280px; gutter 16 (mobile), 24-32 (desktop). Tepi kiri konsisten; ikon diratakan secara optik dengan teks.
- Tidak ada scroll horizontal pada 375px.

**Warna**
- Peran warna dipisah: latar, permukaan, teks utama/sekunder/redup, aksen (aksi utama), dan status (ok/peringatan/bahaya/info). Status tidak dipakai sebagai dekorasi dan aksen tidak dipakai sebagai status.
- Kira-kira 60% netral, 30% sekunder, 10% aksen. Maksimal 3-5 warna teks.
- Kontras teks 4.5:1 (3:1 untuk teks besar ≥24px, atau ≥18.7px tebal); ikon dan batas kontrol 3:1. Status selalu punya bentuk atau label, bukan hanya warna.

**Komponen**
- Satu aksi utama per tampilan. Tombol utama paling menonjol; sekunder lebih tenang.
- 2-3 nilai radius saja, maksimal 3 tingkat bayangan, ketebalan garis konsisten.
- Setiap komponen interaktif punya state: default, hover, focus-visible (cincin ≥2px, kontras 3:1), active, disabled, loading, error. Data punya state kosong, memuat, galat, sukses.
- Target sentuh minimal 44x44px (mobile); desktop minimal 24px, nyaman 32-40px.
- Form: label selalu terlihat di atas field (placeholder bukan label), teks bantuan, pesan error spesifik di dekat field, tinggi field 44-48px di mobile.

**Ikon dan gambar**
- Satu set ikon, satu ketebalan garis, ukuran 16/20/24 selaras dengan teks. Tidak memakai emoji sebagai ikon.
- Gambar punya peran jelas (informasi, suasana, bukti). Tidak ada kotak abu sebagai pengisi. Setiap gambar punya alt; gambar tidak diperbesar melebihi resolusi aslinya.

**Gerak**
- Mikro-interaksi 120-200ms, perubahan layout 250-400ms, easing ease-out. Hanya animasi `transform` dan `opacity`. Hormati `prefers-reduced-motion`.

**Data**
- Tabel: angka rata kanan, header lengket jika panjang, baris 40-48px, tidak lebih dari satu warna data utama. Grafik: label langsung, maksimal 5 warna, ada ringkasan angkanya.

**Teks**
- Bahasa teks: `--lang id|en` atau atribut `<html lang>` (tidak diketahui = aturan kedua bahasa dipakai).
- Aturan lengkap teks UI: skill `ux-writing` dan `ux-writing-id` (Indonesia) atau `ux-writing-en` (Inggris); audit mengukur sebagian (aturan `copy-*`).
- Tombol berisi kata kerja ("Kumpulkan bagian", bukan "Submit"). Tidak ada lorem ipsum. Istilah, tanggal, dan zona waktu konsisten dengan PRD.

## 3. Yang tidak bisa diukur skrip (dicek visual oleh critic)
Titik fokus, keseimbangan, irama, kesatuan, kesan "ini bisa jadi produk apa saja". Gunakan skill `design-principles`.

## 4. Menjalankan audit

Server atau file harus bisa dibuka. Dari folder project:

```
node "$HOME/.claude/skills/ui-craft/run-audit.js" <url-atau-file.html> --widths 375,1440 --tokens docs/design-tokens.css --lang id --shot docs/screenshots --out docs/screenshots/audit.json
```

Contoh: `node "$HOME/.claude/skills/ui-craft/run-audit.js" docs/mockups/arah-a/tryout.html`. Hasilnya: ringkasan (termasuk jumlah keluarga huruf, kelompok warna jenuh, grup kartu identik, kandidat fokus, kepatuhan token), daftar temuan berurut berat, dan baris `VERDICT` (GAGAL bila ada temuan tinggi atau nilai di luar token). `--shot` sekaligus menyimpan `audit-375.png` dan `audit-1440.png`, jadi tidak perlu langkah screenshot terpisah. Playwright dipasang sekali di folder skill ini (`npm install && npx playwright install chromium`, juga dilakukan install-global). Kalau skrip bilang Playwright tidak ditemukan, laporkan perintah yang dicetaknya; jangan mencari Playwright di folder lain.

Alternatif lewat Playwright MCP: baca `audit-dom.js`, lalu jalankan `browser_evaluate` dengan `() => { <isi file>; return __uiAudit({}); }` pada tiap lebar.

Skrip ini heuristik. Ukuran dekoratif besar (angka skor, ornamen) akan ikut terhitung di skala huruf; benarkan di DESIGN.md, jangan dihapus demi lulus audit.
