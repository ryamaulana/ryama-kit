---
name: design-principles
description: Prinsip desain visual, UX, dan Dieter Rams yang wajib dipahami agent UI, beserta cara mengujinya pada screenshot. Dipakai ui-designer saat membuat dan ui-critic saat menilai.
---

# Prinsip desain

Daftar prinsip saja tidak cukup. Model sudah hafal semuanya, dan desain tetap bisa datar. Setiap prinsip di bawah punya **uji** yang bisa dilakukan pada screenshot, dan **kegagalan umum** UI buatan AI. Designer memakainya sebagai tujuan sebelum membuat. Critic memakainya sebagai rubrik saat menilai dan wajib menyebut prinsip yang dilanggar beserta buktinya.

## A. Prinsip visual

| Prinsip | Maksudnya | Uji pada screenshot | Kegagalan umum |
|---|---|---|---|
| 1. Hierarki | Ukuran, bobot, warna, posisi menunjukkan mana yang penting | Sipitkan mata (squint test): apa yang terbaca pertama, kedua, ketiga? Harus sesuai tujuan layar | Semua elemen berbobot sama; judul, kartu, dan tombol setara |
| 2. Kontras | Perbedaan warna, ukuran, bobot; teks minimal 4.5:1 (WCAG) | Ukur rasio teks kecil; cek apakah elemen penting jelas beda dari sekitarnya | Abu muda di atas putih; semua tombol berwarna sama |
| 3. Keseimbangan | Bobot visual simetris atau asimetris, tetap stabil | Blur gambar: apakah satu sisi terlalu berat atau kosong? | Kolom kiri padat, kanan kosong tanpa alasan |
| 4. Perataan | Elemen sejajar pada garis yang sama | Tarik garis tepi: ada elemen yang meleset beberapa piksel? | Margin berbeda di tiap seksi |
| 5. Pengulangan | Pola, warna, gaya konsisten | Komponen sejenis terlihat sama di semua layar? | Tiga gaya tombol berbeda di satu halaman |
| 6. Kedekatan | Yang berkaitan didekatkan | Jarak dalam grup lebih kecil dari jarak antar grup? | Label jauh dari field-nya |
| 7. Ruang kosong | Jarak cukup untuk bernapas dan fokus | Ada ruang di sekitar elemen utama? | Padat merata, atau kosong merata tanpa ritme |
| 8. Kesatuan | Semua elemen satu keluarga | Satu layar dengan logo ditutup: masih terasa produk yang sama dengan layar lain? | Layar terasa dibuat dari template berbeda |
| 9. Penekanan / titik fokus | Satu titik fokus per layar | Hitung: berapa elemen yang berebut perhatian? Harus satu | Tiga CTA sama kuat; angka KPI dan banner dan tombol bersaing |
| 10. Irama dan gerakan | Pola yang mengalir mengarahkan mata | Apakah mata bergerak dari fokus ke detail secara berurutan? | Grid kartu seragam tanpa variasi ukuran |
| 11. Proporsi dan skala | Hubungan ukuran antar elemen; skala tipografi, grid 8pt | Rasio antar ukuran huruf konsisten? Spasi kelipatan 8? | Ukuran huruf acak; semua teks 14-16px |

## B. Gestalt

Proximity, similarity, continuity, closure, figure-ground, common region. Uji: apakah pengelompokan yang terlihat mata sama dengan pengelompokan makna? Kalau dua hal terlihat satu grup tapi tidak berkaitan (atau sebaliknya), ada pelanggaran.

## C. UX dan usability

- **Konsistensi**: pola yang sama berperilaku sama.
- **Feedback**: sistem selalu merespons aksi (memuat, berhasil, gagal).
- **Affordance dan signifier**: tampilan menunjukkan cara memakai.
- **Hick**: makin banyak pilihan, makin lambat keputusan; kurangi opsi setara.
- **Fitts**: target besar dan dekat lebih mudah; target sentuh minimal 44px.
- **Miller**: batas memori kerja sekitar 7±2 item; kelompokkan.
- **Jakob**: pengguna nyaman dengan pola yang mereka kenal; jangan menciptakan ulang kontrol dasar tanpa alasan.
- **Pencegahan error**: cegah dulu, baru pesan error.
- **Aksesibilitas**: kontras, keyboard, screen reader, ukuran target.
- **Kesederhanaan**: hapus yang tidak perlu.

## D. Sepuluh prinsip Dieter Rams

Inovatif, berguna, estetis, mudah dipahami, tidak mencolok, jujur, tahan lama, detail sampai tuntas, ramah lingkungan, dan sesedikit mungkin desain.

## E. Cara memakainya

**Designer, sebelum membuat:** tulis di `docs/DESIGN.md` satu kalimat untuk tiap hal ini, khusus layar yang dikerjakan: titik fokusnya apa, urutan baca (hierarki) apa, dan di mana konsep desain terlihat. Kalau tidak bisa menjawab, belum siap membuat layar itu.

**Critic, saat menilai:** untuk tiap layar beri skor 1-5 pada hierarki, kontras, penekanan/fokus, kesatuan, proporsi, dan konsistensi, dengan bukti dari screenshot. Tambahkan dua uji wajib:
1. **Uji tutup logo:** tanpa logo dan nama produk, apakah layar ini terasa milik produk ini, atau bisa jadi SaaS apa saja?
2. **Uji satu fokus:** sebutkan satu elemen yang menjadi titik fokus. Kalau tidak bisa memilih satu, itu temuan berisiko tinggi.

Desain yang rapi tapi lolos hanya karena tidak ada cacat tetap boleh ditolak dengan alasan "generik", disertai prinsip yang kurang (biasanya penekanan, irama, atau kesatuan).

**Keterbatasan:** prinsip menilai kualitas, bukan selera. Arah gaya tetap datang dari pemilik produk (referensi dan pilihan arah), bukan dari daftar ini.
