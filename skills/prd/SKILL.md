---
name: prd
description: Pakai saat user mau bikin, merevisi, atau mengubah scope PRD/spec aplikasi - "bikin PRD", "ada project baru", "rencanain fitur", "ganti fitur", "PRD-nya nggak sesuai". Wawancarai user sampai tidak ada celah, cocokkan dengan bayangan user lewat walkthrough dan wireframe, lalu tulis atau update PRD dengan decision log.
---

# PRD

Tujuan: PRD yang (1) tidak punya celah yang nanti diisi tebakan saat ngoding, dan
(2) sudah dicocokkan dengan bayangan user SEBELUM dikunci.

## Langkah 0 - Mode
- MODE BARU: belum ada PRD. Mulai dari langkah 1.
- MODE UPDATE: user melampirkan atau menyebut PRD yang sudah ada (file, dokumen, artifact,
  atau docs/PRD.md di project). Baca dulu, tanyakan apa yang berubah dan kenapa, lalu
  ubah HANYA bagian yang terdampak. Jangan menulis ulang dari nol. Catat setiap perubahan
  di Decision Log. Lanjut ke langkah 5.
- Sebelum bertanya, baca semua yang sudah diberikan user (lampiran, project files, kode).
  Jangan menanyakan hal yang sudah ada jawabannya.

## Langkah 1 - Wawancara
- Maksimal 4 pertanyaan per putaran. Kalau ada tool pertanyaan pilihan ganda, pakai itu.
  Kalau tidak, tulis pertanyaan bernomor dengan opsi a/b/c dan tandai satu "(rekomendasi)",
  supaya user bisa jawab singkat seperti "1a 2c 3b".
- Gali area ini, urut dari yang paling menentukan:
  1. Masalah & user: siapa yang pakai, apa yang terjadi kalau aplikasi ini tidak ada?
  2. Scope: apa yang MASUK MVP, apa yang sengaja TIDAK (non-goals)?
  3. Alur utama: langkah demi langkah dari sudut user.
  4. Data: entitas, relasi, siapa pemiliknya, apa yang bisa dihapus.
  5. Edge case: data kosong, gagal, duplikat, dua user bersamaan, input aneh.
  6. Hak akses: siapa boleh melihat dan mengubah apa.
  7. Constraint: stack, tempat deploy, integrasi, budget, performa.
  8. Definisi selesai: acceptance criteria yang bisa dites.
- Setiap jawaban yang membuka celah baru, gali lagi. Berhenti hanya kalau satu putaran
  penuh tidak memunculkan pertanyaan baru.
- Jawaban "terserah" atau "belum tahu" dicatat sebagai Open Question, BUKAN diisi sendiri.
- Kalau dua jawaban bertabrakan, tunjukkan tabrakannya dan minta user memilih.

## Langkah 2 - Walkthrough
Tulis cerita pemakaian 5-10 langkah dari sudut user ("Aku buka app, langsung lihat X,
klik Y, muncul Z"). Minta user mengoreksi. Ini cara tercepat menemukan ketidakcocokan
dengan bayangan user.

## Langkah 3 - Cek visual (sangat disarankan sebelum PRD dikunci)
- Daftar layar utama (biasanya 2-4).
- Tawarkan wireframe kasar sebelum PRD dikunci. Fokus pada layout, isi layar, dan alur
  antar layar, BUKAN warna atau gaya. Buat sebagai gambar atau mockup sederhana yang bisa
  dilihat langsung di percakapan. Di Claude Code, minta agent ui-designer
  (plugin ui-designer-kit) membuat wireframe kasar.
- Masukkan koreksi user dari wireframe ke PRD.

## Langkah 4 - Tulis PRD
- Pakai template di bawah. Status awal: Draft.
- Di chat atau Cowork: buat sebagai dokumen yang bisa disimpan dan diedit (atau file
  PRD.md yang bisa diunduh), supaya bisa ditaruh di docs/PRD.md project nanti.
- Di Claude Code: tulis ke docs/PRD.md.

## Langkah 5 - Review skeptis
Cari sendiri minimal 10 kemungkinan plothole: alur yang tidak lengkap, acceptance
criteria yang kabur, edge case yang belum dibahas, kontradiksi antar bagian, asumsi yang
belum dikonfirmasi. Yang bisa dijawab dari konteks, perbaiki. Sisanya tanyakan ke user
(maksimal 4) atau pindahkan ke Open Questions.

## Langkah 6 - Kunci
- Kalau Open Questions yang memblokir MVP sudah kosong: ubah Status jadi Locked dan
  naikkan versi.
- Laporan ke user singkat: jumlah fitur MVP, Open Questions yang tersisa, celah yang
  ditemukan di langkah 5. Sarankan menjalankan skill prd-review di percakapan baru
  sebelum mulai ngoding.

## Template PRD

```markdown
# PRD: <nama project>
Status: Draft | Locked · Versi: 0.1 · Terakhir diubah: <tanggal>

## 1. Masalah & tujuan
<2-3 kalimat: masalah apa, untuk siapa, kenapa sekarang>

## 2. User
| Peran | Kebutuhan utama | Hak akses |
|---|---|---|

## 3. Non-goals
- <yang sengaja TIDAK dibangun di versi ini>

## 4. Walkthrough
1. ...

## 5. Fitur
### F1. <nama> · Prioritas: MVP | Nanti
Deskripsi singkat.
Acceptance criteria:
- [ ] Diberikan <kondisi>, ketika <aksi>, maka <hasil yang bisa dicek>
Edge case:
- <kosong / gagal / duplikat / ...> -> <perilaku>

## 6. Layar
| Layar | Tujuan | Fitur terkait | Wireframe |
|---|---|---|---|

## 7. Data model
| Entitas | Field penting | Relasi | Catatan |
|---|---|---|---|

## 8. Constraint teknis
- Stack:
- Deploy:
- Integrasi:
- Batasan:

## 9. Assumptions
<yang diisi tanpa konfirmasi eksplisit user - user wajib melihat bagian ini>
- A1. ...

## 10. Open Questions
- [ ] Q1. ... (memblokir MVP: ya/tidak)

## 11. Decision Log
| Tanggal | Versi | Perubahan | Alasan |
|---|---|---|---|
```
