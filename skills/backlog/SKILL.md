---
name: backlog
description: Cara menyusun dan menjalankan backlog berdependensi untuk proyek (docs/backlog.json) lewat skrip backlog.js - urutan kerja, item siap, satu agent per item dengan paket konteks, bukti wajib. Dipakai agent backlog dan orkestrator saat run.
---

# Backlog berdependensi

Tujuan: urutan kerja ditetapkan sekali di awal (layar B tidak dibuat sebelum layar A), tiap agent mengerjakan **satu item dengan konteks sekecil mungkin**, dan status tersimpan di repo agar sesi baru langsung bisa lanjut. Perubahan scope hanya menambah atau menggeser item; yang sudah selesai tidak dirombak.

Skrip: `node "$HOME/.claude/skills/backlog/backlog.js" <perintah>` dari root proyek. Data di `docs/backlog.json`; `docs/BACKLOG.md` dibuat otomatis. **Jangan mengedit kedua file dengan tangan**; semua lewat skrip (cegah salah format dan siklus).

## Perintah
`init --project <nama>` · `import <file|->` (rencana JSON; item yang sudah jalan atau selesai tidak disentuh) · `add --id --title ...` · `next` (paket konteks item siap teratas) · `ready` · `start <id>` · `done <id> --evidence "<bukti>"` · `fail <id> --reason` · `decide <id> --answer` · `retry <id>` · `reject <id> --reason` · `set <id[,id2]> --model opus|sonnet|haiku|bawaan [--size]` (hanya item yang belum jalan) · `validate` · `md` · `status`.

## Bentuk item
`id` (huruf kecil-minus), `title` (bahasa bisnis, bisa dibaca pemilik), `type` (ui, fe, be, qa, sec, review, review-kode, audit-akhir, keputusan), `agent` (ui-designer, fe, be, qa, cyber, ui-critic, ux, architect), `needs` (id yang harus selesai dulu), `criteria` (ID kriteria PRD yang dilayani), `context` (daftar `path#bagian`: **hanya** yang perlu untuk item ini), `done` (definisi selesai yang bisa dibuktikan), `value` (urgent, high, mid, low; `urgent` hanya untuk yang pemilik minta dikerjakan paling awal atau bug keamanan di kode yang sedang dipakai: selalu diambil sebelum item lain yang siap, termasuk irisan yang sudah dimulai; item perbaikan dari temuan `cyber` berderajat medium ke atas pada kode yang sedang dipakai juga `urgent`), `size` (s, m, l), `screen`, `model` (opus, sonnet, haiku; kosong = model bawaan agent), `checkpoint` (pertanyaan bisnis ke pemilik; item ini bukan pekerjaan agent). Ide di luar scope diparkir: `add ... --park` (status `parked`; tidak ikut persen dan tidak dipilih `next`), keluar dengan `unpark <id>`.

## Aturan menyusun
1. Sumber: PRD (kriteria), `docs/UX.md` (layar dan alur), `docs/ARCHITECTURE.md` (API, data), `docs/DESIGN.md` (status). Jangan menambah fitur di luar PRD.
2. Urutan bawaan web: **item bersama dulu** (token desain, komponen bersama, kontrak API dan skema data), lalu **irisan vertikal per tugas pengguna** dari `docs/UX.md`, bukan lapisan demi lapisan. Satu irisan menembus semua lapisan yang dibutuhkan tugas itu (layar, endpoint, penyambungan fe, tes, `ui-critic`) sehingga bisa dicoba sendiri sebelum irisan berikutnya; beri semua item satu irisan `--slice <tugas>` dan `needs` yang jelas. Irisan tanpa dependensi atau dengan dependensi yang sudah selesai boleh jalan lebih dulu. Urutan antar irisan: tugas yang dipakai tugas lain lebih dulu. Pengecualian: perubahan lebar yang mekanis (ganti nama kolom, ubah tipe bersama) satu item sendiri, tidak diiris. Pecah irisan yang tidak muat di satu konteks agent.
   Urutan item dalam satu irisan web: endpoint/kontrak `be` dan komponen tampilan `ui-designer` (boleh paralel; ui-designer memakai data contoh, bukan API) -> penyambungan `fe` (needs: keduanya) -> `ui-critic` untuk layar baru (needs: item ui-designer) -> `qa` (needs: fe dan be). Item boilerplate (`fe`/`be`, struktur dan "Run locally" dari ARCHITECTURE.md) adalah item bersama yang dibutuhkan semua irisan.
3. Item kecil: satu layar, satu endpoint, satu kelompok komponen. Satu item = satu agent. **Item `l` untuk `be`, `fe`, dan `qa` dipecah per seam** (mis. validasi / simpan / pembersihan; atau kelompok kriteria) sebelum masuk antrean: konteks satu pemanggilan tumbuh dengan setiap file dan output, jadi item besar membayar ulang semua yang sudah dibaca di setiap giliran. `l` hanya boleh bila memang tidak bisa dipecah, dengan alasan di `notes`; `validate` mengingatkan item seperti ini.
4. **Wajib ada dan tidak boleh dihapus:** `ui-critic` per kelompok layar BARU atau perubahan tata letak (needs: layar tersebut; bukan untuk edit kecil atau item perbaikan, yang lewat jalur cepat ui-designer), `qa` untuk kriteria PRD (needs: fe dan be terkait), `cyber` bila ada `[SEC]` di arsitektur (needs: be terkait). Inilah yang membuat review pasti jalan. Tambahan: satu item `review-kode` (agent `cyber`, skill `ponytail-review`, needs: item fe/be terkait) per kelompok fe/be berukuran m atau l, dan satu `audit-akhir` (agent `cyber`, skill `ponytail-audit`, needs: semua item build) di ujung antrean.
5. Keputusan bisnis yang tidak bisa ditebak (scope, prioritas) jadi item `checkpoint`; pertanyaan harus bisnis, bukan teknis. Layar atau fitur yang memerlukannya bergantung padanya.
6. `context` hanya bagian yang dibutuhkan (mis. `docs/UX.md#Masuk`), bukan seluruh dokumen. Ini yang menghemat token. Item `ux`, `ui-designer`, dan `ui-critic` untuk layar dashboard atau pemasaran WAJIB memuat konteks jenis layarnya: `docs/UX.md#Penggolongan`, `docs/UX.md#Dashboard` atau `docs/UX.md#Pemasaran` (bagian layar itu), `docs/DESIGN.md#Dial per jenis area`, dan untuk pemasaran `.agents/product-marketing.md`. Tanpa itu agent jatuh kembali ke aturan layar tugas.
7. **Model per item: sesuai berat kerjaannya.** Opus untuk keputusan sulit dan penilaian kualitas; sonnet untuk pekerjaan yang mengikuti pola atau kontrak yang sudah ada, dengan syarat hasilnya selalu dicek (tes, atau `ui-critic` opus). Isi `model` hanya bila berbeda dari bawaan agent.
   | Pekerjaan | Model |
   |---|---|
   | `prd`, `ux`, `architect`, `ui-critic` | opus (bawaan) |
   | `ui-designer`: arah desain, layar dengan pola atau tata letak baru, landing/halaman pemasaran, layar utama pengguna akhir yang menentukan kesan produk | opus (bawaan) |
   | `ui-designer`: layar yang mengikuti kerangka/pola yang sudah ada (daftar, form, tabel di area yang kerangkanya sudah lolos kritikus), porting mockup Approved, item perbaikan, jalur cepat | `sonnet` |
   | `be`: logika yang sulit dibuktikan benar (perhitungan yang menentukan hasil bagi pengguna seperti skor, harga, saldo, tagihan; algoritma; konkurensi dan transaksi), spike berisiko, item `l` yang menyentuh `[SEC]` | `opus` |
   | `be`: CRUD, kontrak, skema, seed, migrasi, penyambungan | sonnet (bawaan) |
   | `fe`, `qa`, `cyber`, `backlog` | sonnet (bawaan); `audit-akhir` = `opus` |
8. **Layar baru yang besar dipecah dua item** (`ui-designer`, jalur penuh, usaha m/l): `<id>` dengan `notes: "Bagian: bangun"` dan `<id>-audit` dengan `notes: "Bagian: audit"` (needs `<id>`, model sama). Item yang membutuhkan layar itu (`ui-critic`, `fe`) bergantung pada `<id>-audit`. Pemanggilan kedua mulai dengan konteks bersih, jadi audit dan perbaikan tidak dibaca ulang di atas ratusan ribu token pembangunan.
9. Setelah `import`, jalankan `validate`. Siklus atau `needs` yang tidak ada = perbaiki sebelum lanjut.

## Aturan menjalankan (orkestrator)
- Ambil `next`, kirim **hanya paket itu** ke agent yang disebut (bukan riwayat chat). Paket ber-`model=` dipanggil dengan parameter `model` itu di tool Agent. Item `PEMILIK=ya`: tanya pemilik lewat AskUserQuestion lalu `decide`.
- Agent selesai → pastikan bukti nyata (path screenshot ada, tes lulus, angka audit) lalu `done --evidence`. Tanpa bukti jangan tandai selesai. Cek bukti dengan perintah ber-output pendek (`ls path`, tes paket terkait dengan `| tail -n 15`), jangan menjalankan ulang seluruh suite dengan output penuh dan jangan membuka screenshot; output itu menumpuk di konteks orkestrator.
- Satu sesi = satu batch. Konteks orkestrator ikut dibaca ulang di setiap giliran, jadi setelah batch dilaporkan, sesi berikutnya dimulai bersih (`/clear` lalu `/fullstack-dev:run`); statusnya ada di backlog, bukan di riwayat chat.
- Gagal → `fail`; dua kali gagal = berhenti dan laporkan ke pemilik. Jangan mengulang tanpa perubahan.
- Item siap yang tidak berbagi file boleh dijalankan paralel.
- **Verifikasi tiap batch.** `ready` dan `next` menaruh item `urgent` paling atas, lalu item verifikasi (`qa`, `sec`, `review`, `review-kode`, `audit-akhir`) paling atas, lalu item dari irisan yang sudah dimulai (supaya irisan selesai dan QA-nya bisa jalan), baru item lain. Satu batch memuat minimal satu item verifikasi bila ada yang siap; bila tidak ada, laporan menyebut item `fe`/`be` mana yang menahan QA.
- Catatan "Terbuka", "belum diuji", atau temuan baru di laporan agent tidak boleh hanya tertinggal di `evidence`: orkestrator menambahkannya sebagai item diparkir (`add ... --park --notes "<asal: id item>"`) dan menyebutnya di laporan batch; agent `backlog` yang menjadwalkan (unpark, value, needs). Ini satu-satunya item yang boleh ditambah orkestrator.
- Perubahan scope dari pemilik: serahkan ke agent `backlog` (dan `prd` bila PRD berubah). Jangan menambah item sendiri.
