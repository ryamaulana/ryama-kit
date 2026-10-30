---
name: ux-writing-id
description: 'Tambahan untuk skill ux-writing pada UI berbahasa Indonesia - nada "kamu", batas kata yang diukur audit, larangan slogan/rima dan klaim di luar PRD. Menang bila bertentangan dengan ux-writing. Dipakai ui-designer, ui-critic, dan ux hanya bila bahasa UI Indonesia (bahasa Inggris: ux-writing-en).'
---

# UX writing Indonesia (tambahan, menang atas `ux-writing`)

Prinsip umum (purposeful, concise, conversational, clear; pola tombol, error, empty state, konfirmasi) ada di skill `ux-writing`. Baca itu dulu. Di sini hanya yang khusus kit ini.

## Aturan tambahan

1. **Bahasa Indonesia wajar, sapaan "kamu".** Tanpa seruan berlebihan; maksimal 1 tanda seru per layar. Istilah Inggris hanya yang memang dipakai pengguna. Sentence case tetap (huruf besar di awal kalimat saja).
2. **Tugas dulu, merek belakangan.** Judul layar fungsional menyebut tugasnya ("Masuk"), bukan slogan. Tanpa rima atau kiasan di layar fungsional (masuk, daftar, bayar, ujian berlangsung). Slogan hanya di landing page dan tetap harus bilang produknya apa.
3. **Jangan mengulang.** Kalimat yang kalau dihapus tidak mengurangi informasi, dihapus.
4. **Fakta hanya dari PRD.** Angka, fitur, "otomatis", "gratis" harus bisa ditunjuk ke PRD. Belum ada di PRD: tulis netral dan catat sebagai pertanyaan ke user. Jangan mengarang.
5. **Satu istilah satu makna.** Daftar istilah (maks 10 baris) ditulis di `docs/DESIGN.md` bagian "Istilah & nada" sebelum menulis teks.
6. **Placeholder = contoh isi** ("nama@email.com"), bukan aturan. Aturan ("minimal 8 karakter") jadi teks bantu permanen, hanya di layar yang membuat data (daftar, ganti sandi). Layar masuk: tanpa aturan.
7. **Batas kata (lebih ketat dari ux-writing, diukur audit):**

| Elemen | Batas |
|---|---|
| Judul layar | 1-6 kata, maks 8 |
| Subjudul | 1 kalimat, ≤ 16 kata; tidak perlu bila judul sudah cukup |
| Kalimat isi | ≤ 20 kata; paragraf ≤ 2 kalimat |
| Tombol | 1-3 kata, kata kerja + objek |
| Tautan | tidak terpotong di ujung baris (`white-space: nowrap`) |

## Contoh kalibrasi (layar masuk TryoutHub, teks asli buruk)

| Asli | Masalah | Perbaikan |
|---|---|---|
| "Isi bulatannya, hitung waktunya." | rima, kiasan, tidak bilang produk | "Tryout dengan timer per bagian" (jika di PRD) |
| "Tryout dengan timer per bagian dan lembar jawaban yang tersimpan otomatis, seperti ujian sungguhan." | dua fitur + perbandingan kabur, 16 kata | satu fakta dari PRD, mis. "Jawabanmu tersimpan otomatis." |
| "Masuk ke akunmu" | "ke akunmu" tidak menambah informasi | "Masuk" |
| "Lanjutkan tryout yang sedang berjalan atau lihat skor terakhirmu." | iklan di halaman tugas, dua tujuan | hapus, atau "Lanjutkan tryout atau lihat skor." |
| Placeholder sandi "Minimal 8 karakter" | aturan di layar masuk | kosongkan; aturan pindah ke layar Daftar |
| "…Syarat layanan dan Kebijakan privasi" terpotong | tautan terbelah | `nowrap` atau pendekkan |

## Uji sebelum menyerahkan

Uji hapus (tiap kalimat), uji tutup merek (paham produk dan langkah berikutnya hanya dari teks), uji hitung (tabel di atas), uji jejak (tiap klaim ke PRD), uji ulang (info muncul dua kali?).

Critic: skor copy 1-5, tiap pelanggaran ditulis **kutipan asli → masalah → pengganti**. Audit `ui-craft` mengukur: panjang judul/kalimat/tombol, placeholder berisi aturan, kalimat berulang, tautan terpotong, kata pengisi, tanda seru. Kejelasan makna dinilai critic.
