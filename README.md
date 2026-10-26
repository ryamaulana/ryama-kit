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
| prd | wawancara, tulis PRD + acceptance criteria | opus |
| architect | ARCHITECTURE.md + TASKS.md | opus |
| ui-designer (kit lama) | referensi -> DESIGN.md -> mockup -> build visual | default |
| fe | wiring, state, API, scaffold (bukan visual) | sonnet |
| be | API, DB, auth, logic | opus |
| ui-critic | review screenshot independen, maks 7 perbaikan | sonnet |
| cyber | review keamanan read-only | sonnet |
| qa | acceptance criteria -> tes Playwright | haiku |

Command (scope): `/fullstack-dev:build <all|boilerplate|ui-only|fe-only|be-only|review>`,
pintasan `/fullstack-dev:boilerplate`, `:ui-only`, `:fe-only`, dan `/fullstack-dev:prd-check`.

Hooks: SessionStart nyuntik aturan routing; PostToolUse ngingetin ui-critic (file UI) dan cyber (path sensitif);
SubagentStart nulis `.claude/agent-log.txt` buat bukti agent beneran jalan. Hook ditulis dengan Node (tanpa bash/jq), jadi jalan di Windows.

Cek setelah install: nama field hook (`agent_type`) dan format `skills:` di agent plugin bisa beda antar versi.
Kalau skill plugin (playwright-review, security-checklists) tidak ke-load, coba nama `fullstack-dev:<skill>`.

## flow-viewer
Buka http://localhost:4777 di tab browser saat ngoding. Server nyala otomatis tiap sesi.
Nunjukin agent/skill yang beneran jalan dan menandai langkah flow yang kelewat. Detail: `plugins/flow-viewer/README.md`.
Install: `claude plugin install flow-viewer@ryama-kit` (butuh node).
