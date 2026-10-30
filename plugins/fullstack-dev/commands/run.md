---
description: "Jalankan backlog: ambil item siap, satu agent per item dengan konteks sekecil mungkin, sampai habis atau berhenti di keputusan pemilik. Usage: /fullstack-dev:run [jumlah item, default 5]"
argument-hint: "[jumlah item, default 5]"
model: sonnet
---

Jumlah item maksimal untuk run ini: $ARGUMENTS (kosong = 5; `1` = hanya item berikutnya).

Baca skill `backlog` dan `project-context`. Butuh `docs/backlog.json`; kalau belum ada, berhenti dan jalankan `/fullstack-dev:backlog` dulu. Orkestrator tetap ringan: kamu hanya mengatur antrean dan tidak mengerjakan item sendiri.

**Item yang tertinggal dari sesi lalu.** Sebelum mengambil item baru, `node "$HOME/.claude/skills/backlog/backlog.js" list --status running`. Item `running` di awal sesi berarti sesi sebelumnya berhenti di tengah (tidak ada agent yang masih jalan). Untuk tiap item itu, cek bukti yang diminta paketnya dengan perintah ber-output pendek (file ada, tes paket terkait lulus): lengkap → `done --evidence`; tidak lengkap → `retry <id>`, lalu item itu ikut batch ini dengan catatan "lanjutkan dari perubahan yang sudah ada di working tree, jangan mulai dari nol". Jangan membuang perubahan yang belum di-commit.

Kamu berjalan di sonnet (frontmatter perintah ini): orkestrator hanya mengatur antrean, mengirim paket, dan memeriksa bukti; kualitas kode ditentukan agent dan model per item.

**Isi batch.** Mulai dengan `ready`. Bila ada item verifikasi siap (`qa`, `sec`, `review`, `review-kode`, `audit-akhir`; skrip menaruhnya paling atas), minimal satu masuk batch ini. Bila tidak ada, sebut di laporan item `fe`/`be` mana yang menahan QA, dan dahulukan item itu.

Ulangi sampai batas jumlah item tercapai:
1. `node "$HOME/.claude/skills/backlog/backlog.js" next`. Keluar kode 2 = tidak ada item siap: berhenti dan lapor sebabnya (selesai, menunggu keputusan, atau gagal).
2. Item `PEMILIK=ya`: tanya pemilik lewat AskUserQuestion (satu pertanyaan bisnis, opsi dengan satu "(rekomendasi)"), lalu `decide`. Lanjut.
3. Item biasa: `start <id>`, lalu delegasikan ke agent yang disebut dengan **hanya paket konteks itu** (apa adanya, termasuk baris "Hemat token"; paket ber-`model=` dipanggil dengan parameter `model` itu di tool Agent) (untuk `ui-designer`/`ui-critic`: tanpa keputusan visual dan tanpa menyuruh melewati langkahnya). Jangan menempelkan riwayat chat atau dokumen penuh. Item siap lain yang tidak berbagi file boleh paralel.
4. Setelah agent selesai, **periksa buktinya nyata** (file screenshot ada, tes lulus, angka audit tercatat) dengan perintah ber-output pendek: `ls <path>`, tes paket yang disentuh item dengan `| tail -n 15`. Jangan menjalankan ulang seluruh suite dengan output penuh dan jangan membuka screenshot; semua output itu menumpuk di konteksmu dan dibaca ulang di setiap giliran. Lalu `done <id> --evidence "..."`. Gagal atau tanpa bukti: `fail <id> --reason "..."`. Dua kali gagal pada item yang sama = berhenti dan laporkan.
5. Item `ui-critic` yang menghasilkan daftar perbaikan: minta `backlog` menambah SATU item perbaikan berisi seluruh batch (maks 2 putaran per layar), jangan memperbaiki di tempat. Item `ui-designer` setelah DESIGN.md Approved yang tidak mengubah tata letak dikerjakan lewat jalur cepat agent itu.

Akhiri dengan laporan pemilik (Indonesia, maks 15 baris): item yang selesai dengan bukti satu baris per item, yang gagal atau menunggu keputusan, progres selesai/total. Lalu satu AskUserQuestion: commit batch ini ke git lokal (tanpa push)? Opsi: "Commit (rekomendasi)" / "Jangan dulu". Setelah dijawab, tutup dengan satu baris: "Batch berikutnya: ketik `/clear`, lalu `/fullstack-dev:run`."

**Satu sesi = satu batch.** Jangan memulai batch kedua di sesi yang sama, juga bila pemilik menulis "lanjut": konteks orkestrator dibaca ulang di setiap giliran, dan di sesi panjang satu giliran bisa membaca ratusan ribu token. Minta pemilik `/clear` dulu; semua status ada di `docs/backlog.json`. Jangan menambah fitur di luar PRD.
