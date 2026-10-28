---
description: "Jalankan backlog: ambil item siap, satu agent per item dengan konteks sekecil mungkin, sampai habis atau berhenti di keputusan pemilik. Usage: /fullstack-dev:run [jumlah item, default 5]"
argument-hint: "[jumlah item, default 5]"
---

Jumlah item maksimal untuk run ini: $ARGUMENTS (kosong = 5; `1` = hanya item berikutnya).

Baca skill `backlog` dan `project-context`. Butuh `docs/backlog.json`; kalau belum ada, berhenti dan jalankan `/fullstack-dev:backlog` dulu. Orkestrator tetap ringan: kamu hanya mengatur antrean dan tidak mengerjakan item sendiri.

Ulangi sampai batas jumlah item tercapai:
1. `node "$HOME/.claude/skills/backlog/backlog.js" next`. Keluar kode 2 = tidak ada item siap: berhenti dan lapor sebabnya (selesai, menunggu keputusan, atau gagal).
2. Item `PEMILIK=ya`: tanya pemilik lewat AskUserQuestion (satu pertanyaan bisnis, opsi dengan satu "(rekomendasi)"), lalu `decide`. Lanjut.
3. Item biasa: `start <id>`, lalu delegasikan ke agent yang disebut dengan **hanya paket konteks itu** (untuk `ui-designer`/`ui-critic`: tanpa keputusan visual dan tanpa menyuruh melewati langkahnya). Jangan menempelkan riwayat chat atau dokumen penuh. Item siap lain yang tidak berbagi file boleh paralel.
4. Setelah agent selesai, **periksa buktinya nyata** (file screenshot ada, tes lulus, angka audit tercatat). Lalu `done <id> --evidence "..."`. Gagal atau tanpa bukti: `fail <id> --reason "..."`. Dua kali gagal pada item yang sama = berhenti dan laporkan.
5. Item `ui-critic` yang menghasilkan daftar perbaikan: minta `backlog` menambah SATU item perbaikan berisi seluruh batch (maks 2 putaran per layar), jangan memperbaiki di tempat. Item `ui-designer` setelah DESIGN.md Approved yang tidak mengubah tata letak dikerjakan lewat jalur cepat agent itu.

Akhiri dengan laporan pemilik (Indonesia, ringkas): item yang selesai dengan bukti, yang gagal atau menunggu keputusan, progres selesai/total, dan perintah berikutnya (`/fullstack-dev:run` lagi atau `/fullstack-dev:backlog apa berikutnya`). Jangan menambah fitur di luar PRD.
