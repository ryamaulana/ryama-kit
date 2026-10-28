# ryama-kit

Marketplace plugin pribadi untuk Claude Code. Install sekali, kepake di semua project.

```
ryama-kit/
├── .claude-plugin/marketplace.json   # daftar plugin
├── plugins/
│   ├── ui-designer-kit/              # agent ui-designer + Playwright MCP + template DESIGN.md
│   ├── fullstack-dev/                # prd, architect, fe, be, ui-critic, cyber, qa + commands + hooks
│   └── flow-viewer/                  # graf live ala n8n di localhost:4777
├── install-global.sh                 # install semuanya secara global
└── setup-library.sh                  # pasang / update awesome-design-md
```

## Install global
1. Taruh folder ini di tempat permanen (jangan di Downloads), misal `~/ryama-kit`.
2. Jalankan:
   ```bash
   bash ~/ryama-kit/install-global.sh
   ```

Yang terpasang dan lokasinya:
| Komponen | Lokasi |
|---|---|
| design-taste-frontend, web-design-guidelines | `~/.claude/skills/` |
| awesome-design-md + INDEX.md | `~/.claude/design-library/` |
| plugin ui-designer-kit (agent + Playwright MCP) | user settings, scope `user` |

Cek: `claude plugin list` harus menampilkan `ui-designer-kit@ryama-kit` dengan status enabled.

## Update
- Library gaya: `bash ~/ryama-kit/setup-library.sh`
- Skill: `npx skills update -g`
- Agent/plugin: edit file di `~/ryama-kit/plugins/...`, berlaku di sesi berikutnya
  atau setelah `/reload-plugins`.

## Pakai di banyak komputer (laptop + VPS)
Push folder ini ke repo GitHub (boleh private), lalu di komputer lain:
```bash
claude plugin marketplace add <username>/ryama-kit
claude plugin install ui-designer-kit@ryama-kit
```
Skill dan library tetap dipasang dengan langkah 1-3 di install-global.sh.

## Nambah plugin baru nanti
Taruh foldernya di `plugins/`, tambahkan entry di `.claude-plugin/marketplace.json`,
lalu `claude plugin install <nama>@ryama-kit`.

## Per project
Cukup tambahkan di CLAUDE.md project:
```
## UI
Semua pekerjaan UI didelegasikan ke agent ui-designer.
docs/DESIGN.md adalah sumber kebenaran visual.
```

## fullstack-dev (crew fullstack)
Butuh ui-designer-kit terpasang: semua pekerjaan visual didelegasikan ke `ui-designer`.
Dokumen kerja per project ada di `docs/`: PRD.md, ARCHITECTURE.md, TASKS.md, DESIGN.md, mockups/, screenshots/.

| Agent | Tugas | Model |
|---|---|---|
| prd | PRD + acceptance criteria, mengikuti skill prd dan prd-review | opus |
| ux | keputusan UX otomatis (langkah paling sedikit, modal/panel/halaman, navigasi, state) -> docs/UX.md | opus |
| architect | ARCHITECTURE.md (+ threat model) + KEPUTUSAN.md untuk pemilik; TASKS.md hanya bila tanpa backlog | opus |
| backlog | backlog berdependensi (docs/backlog.json), triase ide dan bug terhadap PRD | sonnet |
| ui-designer (ui-designer-kit) | konsep -> rancangan layar -> token -> bangun sekali -> cek sekali; jalur cepat untuk edit kecil | opus |
| fe | wiring, state, API, scaffold (bukan visual) | sonnet |
| be | API, DB, auth, logic | opus |
| ui-critic | menilai hasil terhadap konsep dan rancangan layar (bukan hanya token), satu batch perbaikan; hanya untuk layar baru/ubah tata letak | opus |
| cyber | review keamanan read-only | sonnet |
| qa | acceptance criteria -> tes Playwright | haiku |

Command (scope): `/fullstack-dev:build <all|boilerplate|ui-only|fe-only|be-only|review>`,
pintasan `/fullstack-dev:boilerplate`, `:ui-only`, `:fe-only`, `/fullstack-dev:prd-check`, dan
**`/fullstack-dev:ui-direction`** (brief selera -> satu desainer menulis 3 konsep -> 3 desainer membangun paralel, 1 layar kunci desktop -> kamu pilih satu -> arah terpilih dilengkapi dan dinilai kritikus). Orkestrator hanya kurir: kata-katamu diteruskan apa adanya, keputusan visual milik ui-designer. `ui-only` menolak jalan sebelum ada `docs/DESIGN.md` berstatus Approved.

### Alur yang disarankan (pemilik: ide, jawaban PRD, referensi, penilaian arah)
Satu pintu: **`/fullstack-dev:start <ide atau lanjut>`**. Urutannya PRD (dicari dulu di mana pun ia berada) -> UX -> arah desain (3 opsi dari referensimu) -> arsitektur + ringkasan keputusan -> backlog -> build. Persetujuanmu diminta di UX, arah desain, dan keputusan arsitektur.

Aturan desain: sebelum kamu menyetujui arah, desainer hanya membuat **Tahap A** (token, sheet komponen, layar inti: alur utama produk, tanpa batas angka). Layar sisanya (Tahap B) baru dibuat setelah arah disetujui. Ganti arah di tengah jalan mengulang Tahap A saja. Referensi desain ditanya sebelum desainer mulai; `ui-critic` maksimal 2 putaran perbaikan per layar. Ide di luar PRD diparkir di backlog (`--park`, status `parked`, tidak ikut persen) sampai kamu setuju.

Ponytail (MIT, DietrichGebert) dipakai terbatas: skill `ponytail` (level lite) hanya di `fe` dan `be`; `ponytail-review` dan `ponytail-audit` hanya di `cyber` lewat item backlog `review-kode` dan `audit-akhir`. Hook, ledger, dan webhook plugin aslinya tidak dipasang. `ui-designer` bisa mencobanya lewat catatan `ponytail: kode-mockup` (opsional, uji). Bila kamu memasang plugin ponytail penuh, set `PONYTAIL_SUBAGENT_MATCHER` ke `fe|be` agar agent desain dan PRD tidak ikut.

Anti-slop (MIT, miqdadbadjuber): hanya `antislop` dan `antislop-ui`, dipanggil `ui-designer` sebelum membangun di Tahap A (pencegahan; Tahap A pendek) dan di tahap review pada Tahap B (agar tidak dibaca ulang tiap giliran), dengan DESIGN.md dan design-taste-frontend tetap menentukan arah. Wizard, pertanyaan mode, dan file audit milik aslinya dilewati.

Bahasa teks UI mengikuti proyek: `Bahasa UI: id|en` (dari `docs/PROJECT.md` atau PRD). Indonesia memakai `ux-writing-id`, Inggris memakai `ux-writing-en`; audit `ui-craft` punya `--lang id|en` dan membaca `<html lang>`.

Matt Pocock skills (MIT): `codebase-design` dan `domain-modeling` di `architect`; `codebase-design` dan `tdd` di `be`, tanpa wawancara ke pemilik (adaptasi di agent). Backlog meminjam ide irisan vertikal dari `to-tickets` (tracer bullet); mesin backlog kita tidak diganti.

Proyek berjalan banyak sesi: `/fullstack-dev:backlog <ide|bug|apa berikutnya>` mengatur antrean, `/fullstack-dev:run [N]` mengerjakan item siap (satu agent per item dengan paket konteks kecil; kritikus, QA, dan cyber ikut karena mereka item di backlog). Status ada di `docs/backlog.json` (jangan diedit tangan; skrip `skills/backlog/backlog.js`) dan `docs/BACKLOG.md`.

Perintah terpisah tetap ada: `/fullstack-dev:prd-check`, `:ui-direction`, `:build <scope>`.

Dokumen proyek: `docs/PROJECT.md` (posisi PRD dan tahap), `UX.md`, `DESIGN.md`, `ARCHITECTURE.md`, `KEPUTUSAN.md`, `backlog.json`.
Pantau di http://localhost:4777 (flow-viewer).

Hooks: SessionStart nyuntik aturan routing; PostToolUse ngingetin ui-critic (file UI) dan cyber (path sensitif);
SubagentStart nulis `.claude/agent-log.txt` buat bukti agent beneran jalan. Hook ditulis dengan Node (tanpa bash/jq), jadi jalan di Windows.

Cek setelah install: nama field hook (`agent_type`) dan format `skills:` di agent plugin bisa beda antar versi.
Kalau skill plugin (playwright-review, security-checklists) tidak ke-load, coba nama `fullstack-dev:<skill>`.

## flow-viewer
Buka http://localhost:4777 di tab browser saat ngoding. Server nyala otomatis tiap sesi.
Nunjukin agent/skill yang beneran jalan dan menandai langkah flow yang kelewat. Detail: `plugins/flow-viewer/README.md`.
Tampilan: tema terang/gelap (tombol di kanan atas) dan lima tab: **Live** (grafik agent), **Token** (per agent), **Backlog**, **Skill** (yang sedang dan terakhir dipanggil, plus yang belum terbukti), **Log**. Sidebar berisi status, percakapan, dan file yang diubah.
Riwayat run disimpan otomatis ke `~/.claude/flow-viewer/history.db` (SQLite bawaan Node 22.5+, kalau Node lebih lama: file JSON di folder `history/`). Tab **Riwayat** untuk melihat run lama (hanya baca) dan membandingkan token dua run. Jangan di-commit ke Git.
Install: `claude plugin install flow-viewer@ryama-kit` (butuh node).

## Skill milik kit (`skills/`)
`prd`, `prd-review`, `design-principles`, `ui-craft` (aturan + skrip audit terukur), `ux-writing` dan `ux-designer` (disalin dari repo MIT, lihat SOURCE.txt), `ux-writing-id`, `project-context`, `backlog` (aturan + skrip) ada di folder `skills/` dan dipakai agent lewat `skills:`. Skrip install membuat junction/symlink dari `~/.claude/skills/<nama>` ke folder ini, jadi sumbernya satu dan ikut ter-commit ke git. Setelah menambah skill baru di `skills/`, jalankan ulang `install-global`.
