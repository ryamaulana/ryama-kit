---
name: backlog
description: Cara menyusun dan menjalankan backlog berdependensi untuk proyek (docs/backlog.json) lewat skrip backlog.js - urutan kerja, item siap, satu agent per item dengan paket konteks, bukti wajib. Dipakai agent backlog dan orkestrator saat run.
---

# Backlog berdependensi

Tujuan: urutan kerja ditetapkan sekali di awal (layar B tidak dibuat sebelum layar A), tiap agent mengerjakan **satu item dengan konteks sekecil mungkin**, dan status tersimpan di repo agar sesi baru langsung bisa lanjut. Perubahan scope hanya menambah atau menggeser item; yang sudah selesai tidak dirombak.

Skrip: `node "$HOME/.claude/skills/backlog/backlog.js" <perintah>` dari root proyek. Data di `docs/backlog.json`; `docs/BACKLOG.md` dibuat otomatis. **Jangan mengedit kedua file dengan tangan**; semua lewat skrip (cegah salah format dan siklus).

## Perintah
`init --project <nama>` · `import <file|->` (rencana JSON; item yang sudah jalan atau selesai tidak disentuh) · `add --id --title ...` · `next` (paket konteks item siap teratas) · `ready` · `start <id>` · `done <id> --evidence "<bukti>"` · `fail <id> --reason` · `decide <id> --answer` · `retry <id>` · `reject <id> --reason` · `validate` · `md` · `status`.

## Bentuk item
`id` (huruf kecil-minus), `title` (bahasa bisnis, bisa dibaca pemilik), `type` (ui, fe, be, qa, sec, review, review-kode, audit-akhir, keputusan), `agent` (ui-designer, fe, be, qa, cyber, ui-critic, ux, architect), `needs` (id yang harus selesai dulu), `criteria` (ID kriteria PRD yang dilayani), `context` (daftar `path#bagian`: **hanya** yang perlu untuk item ini), `done` (definisi selesai yang bisa dibuktikan), `value` (high, mid, low), `size` (s, m, l), `screen`, `checkpoint` (pertanyaan bisnis ke pemilik; item ini bukan pekerjaan agent). Ide di luar scope diparkir: `add ... --park` (status `parked`; tidak ikut persen dan tidak dipilih `next`), keluar dengan `unpark <id>`.

## Aturan menyusun
1. Sumber: PRD (kriteria), `docs/UX.md` (layar dan alur), `docs/ARCHITECTURE.md` (API, data), `docs/DESIGN.md` (status). Jangan menambah fitur di luar PRD.
2. Urutan bawaan web: **item bersama dulu** (token desain, komponen bersama, kontrak API dan skema data), lalu **irisan vertikal per tugas pengguna** dari `docs/UX.md`, bukan lapisan demi lapisan. Satu irisan menembus semua lapisan yang dibutuhkan tugas itu (layar, endpoint, penyambungan fe, tes, `ui-critic`) sehingga bisa dicoba sendiri sebelum irisan berikutnya; beri semua item satu irisan `--slice <tugas>` dan `needs` yang jelas. Irisan tanpa dependensi atau dengan dependensi yang sudah selesai boleh jalan lebih dulu. Urutan antar irisan: tugas yang dipakai tugas lain lebih dulu. Pengecualian: perubahan lebar yang mekanis (ganti nama kolom, ubah tipe bersama) satu item sendiri, tidak diiris. Pecah irisan yang tidak muat di satu konteks agent.
3. Item kecil: satu layar, satu endpoint, satu kelompok komponen. Item "usaha besar" dipecah. Satu item = satu agent.
4. **Wajib ada dan tidak boleh dihapus:** `ui-critic` per kelompok layar BARU atau perubahan tata letak (needs: layar tersebut; bukan untuk edit kecil atau item perbaikan, yang lewat jalur cepat ui-designer), `qa` untuk kriteria PRD (needs: fe dan be terkait), `cyber` bila ada `[SEC]` di arsitektur (needs: be terkait). Inilah yang membuat review pasti jalan. Tambahan: satu item `review-kode` (agent `cyber`, skill `ponytail-review`, needs: item fe/be terkait) per kelompok fe/be berukuran m atau l, dan satu `audit-akhir` (agent `cyber`, skill `ponytail-audit`, needs: semua item build) di ujung antrean.
5. Keputusan bisnis yang tidak bisa ditebak (scope, prioritas) jadi item `checkpoint`; pertanyaan harus bisnis, bukan teknis. Layar atau fitur yang memerlukannya bergantung padanya.
6. `context` hanya bagian yang dibutuhkan (mis. `docs/UX.md#Masuk`), bukan seluruh dokumen. Ini yang menghemat token.
7. Setelah `import`, jalankan `validate`. Siklus atau `needs` yang tidak ada = perbaiki sebelum lanjut.

## Aturan menjalankan (orkestrator)
- Ambil `next`, kirim **hanya paket itu** ke agent yang disebut (bukan riwayat chat). Item `PEMILIK=ya`: tanya pemilik lewat AskUserQuestion lalu `decide`.
- Agent selesai → pastikan bukti nyata (path screenshot ada, tes lulus, angka audit) lalu `done --evidence`. Tanpa bukti jangan tandai selesai.
- Gagal → `fail`; dua kali gagal = berhenti dan laporkan ke pemilik. Jangan mengulang tanpa perubahan.
- Item siap yang tidak berbagi file boleh dijalankan paralel.
- Perubahan scope dari pemilik: serahkan ke agent `backlog` (dan `prd` bila PRD berubah). Jangan menambah item sendiri.
