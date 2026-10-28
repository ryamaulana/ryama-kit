# flow-viewer

Graf live ala n8n: agent mana yang beneran jalan, skill apa yang kepanggil, dan apakah ada langkah flow yang kelewat.

## Cara kerja
Hook Claude Code -> `hooks/scripts/send.js` -> server Node lokal (`server/server.js`, 127.0.0.1:4777, tanpa dependency) -> halaman `http://localhost:4777`.
Server otomatis nyala di SessionStart. Cek manual: `/flow-viewer:flow`.

## Yang ditampilkan
- Seluruh crew (8 agent) + node Prompt dan Claude (sesi utama) sudah tampil dari awal dalam keadaan idle, jadi graf tidak pernah kosong. Saat flow tertentu dijalankan, agent di luar scope-nya meredup.
- Timeline di bawah graf: kapan tiap agent mulai/selesai (bisa tumpang tindih kalau paralel).
- Agent background ditandai `BG`; statusnya baru "selesai" saat SubagentStop datang, bukan saat panggilannya kembali.
- Node per agent: menunggu / berjalan / selesai / DILEWATI, jumlah putaran, durasi, jumlah tool, aktivitas terakhir, skill yang dipanggil.
- Flow yang diharapkan (untuk deteksi langkah kelewat) datang dari command: `/fullstack-dev:build <scope>`, `:boilerplate`, `:ui-only`, `:fe-only`, `:prd-check`. Definisi ada di `server/flows.json` (edit buat nambah/ubah flow).
- Langkah wajib yang tidak jalan sampai giliran selesai ditandai DILEWATI (kuning). Node opsional yang tidak jalan tampil redup.
- Tanpa command flow, agent apa pun yang dipanggil tetap muncul sebagai node "di luar flow".
- Log kejadian lengkap juga disimpan di `~/.claude/flow-viewer/events.jsonl`.

## Detail per node (klik node)
Klik node mana pun (atau "lihat semua file & diff" di panel kanan) untuk membuka panel detail:
- **Ringkasan**: status, putaran, durasi, model (yang dipakai menurut transcript, plus yang tertulis di definisi agent), token input/output/cache, konteks terakhir, tool yang diizinkan, skill (di-preload vs dipanggil), pemakaian tool.
- **Aktivitas**: tiap tool call berurutan. Klik untuk melihat diff Edit/MultiEdit/Write, command Bash beserta outputnya, file yang dibaca, prompt yang diberikan ke subagent, dan hasil/durasi.
- **File**: file yang diubah beserta +baris/−baris dan diff-nya.
- **Tugas & hasil**: prompt yang diterima agent dan jawaban akhirnya.

Token dan model aktual dibaca dari file transcript (`transcript_path` dari hook). Kalau kolom token kosong, field itu belum dikirim oleh versi Claude Code kamu; lihat `~/.claude/flow-viewer/events.jsonl`. Isi diff dipotong (~1800 karakter per sisi) dan disimpan di memori server, bukan di disk.
PostToolUse sekarang dipasang untuk semua tool (untuk hasil dan durasi), jadi ada sedikit overhead per tool call.

## Batasan
- Berhenti untuk approval (mis. mockup di ui-only/all) normal; langkah sesudahnya tampil "dilewati" sampai kamu lanjutkan, lalu node ikut nyala.
- Status error belum ada: hook subagent tidak membawa status gagal, jadi agent yang berhenti dianggap "selesai".
- Nama field di payload hook (`agent_type`, `tool_input.subagent_type`) bisa beda antar versi Claude Code. Server membaca beberapa jalur (SubagentStart/Stop dan PreToolUse/PostToolUse Agent). Kalau node nggak nyala, lihat `~/.claude/flow-viewer/events.jsonl` untuk melihat payload asli dan sesuaikan `server/server.js`.
- Butuh `node` saja (hook ditulis dengan Node supaya jalan di Windows tanpa bash/jq). Ganti port dengan env `FLOW_VIEWER_PORT`.

## Dibaca Claude lain (pemantau lewat browser)

- `http://localhost:4777/report` : teks polos, auto-refresh 4 detik. STATUS (BEKERJA / MENUNGGU KAMU / IDLE), pertanyaan yang menunggu beserta pilihannya, tabel agent, file diubah, error, 14 percakapan terakhir.
- `http://localhost:4777/report.md` : isi yang sama tanpa HTML.
- Tombol **Percakapan** di viewer: semua prompt, jawaban Claude, pertanyaan, izin, error. Banner kuning muncul saat Claude menunggu kamu.
- Catatan: ini ringkasan dari hook, bukan salinan terminal persis.
