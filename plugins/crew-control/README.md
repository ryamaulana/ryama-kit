# Crew Control

Dashboard lokal untuk menjalankan dan memantau tim agent Claude Code. Berjalan di laptop Windows pemilik; HP hanya lewat Tailscale. Rincian teknis: `docs/ARCHITECTURE.md` (bagian 12 dan 13).

## Prasyarat

Node.js >= 22.13, npm 10, Git, Claude Code CLI >= 2.1.314 (sudah login), plugin `fullstack-dev` dan `ui-designer-kit` terpasang. Tailscale hanya bila ingin membuka dari HP.

## 1. Pasang dan jalankan di laptop

```
npm ci
npm run build
npm start
```

Buka http://127.0.0.1:4780/app/. Database dibuat otomatis di `data/crew.db`. Port 4777 milik Flow Viewer; Crew Control memakai 4780.

## 2. Isi `.env`

Salin `.env.example` menjadi `.env` (semua opsional, tanpa rahasia). Minimal:

| Variabel | Isi |
|---|---|
| `CREW_WORK_ROOT` | folder kerja tetap; run hanya boleh di folder ini atau di bawahnya |
| `CREW_VAPID_SUBJECT` | `mailto:` pemilik, dipakai pemberitahuan HP (Web Push); dipakai sejak fitur push ada |
| `CREW_HOST` | biarkan `127.0.0.1`. `0.0.0.0` dan `::` ditolak server |

Lainnya: `CREW_PORT`, `CREW_DB`, `CREW_DEFAULT_MODEL`, `CREW_MAX_RUNS`, `CREW_CLAUDE_BIN`, `CREW_TEAM_DIRS`, `CREW_ALLOWED_HOSTS`, `CREW_ALLOWED_ORIGINS`. Artinya ada di `.env.example`. Mulai ulang server setelah mengubah `.env`.

Agar hidup otomatis saat masuk Windows, buat tugas Task Scheduler "At log on" yang menjalankan `npm start` di folder ini (opsional).

## 3. Plugin `crew-control` (hook sesi desktop)

Pasang plugin `crew-control` agar sesi Claude Code di desktop ikut terpantau, lalu matikan hook Flow Viewer supaya kejadian tidak ganda:

```
claude plugin disable flow-viewer@ryama-kit
```

Catatan: manifes plugin (`.claude-plugin/plugin.json`) untuk hook sesi desktop (F10) belum dibuat di repo ini, jadi langkah pasang plugin baru bisa dijalankan setelah item itu selesai. Mematikan Flow Viewer aman dilakukan kapan saja; nyalakan lagi dengan `claude plugin enable flow-viewer@ryama-kit`.

## 4. Buka dari HP lewat Tailscale

1. Pasang Tailscale di laptop dan HP, masuk dengan akun yang sama.
2. Batasi siapa yang boleh masuk: isi `CREW_TAILSCALE_USERS` di `.env` dengan login Tailscale pemilik (pisah koma bila lebih dari satu), lalu mulai ulang server. Kosong berarti semua anggota tailnet boleh.
3. Bagikan server ke tailnet (tetap tanpa membuka ke internet umum):

```
tailscale serve --bg --https=443 http://127.0.0.1:4780
```

4. Di HP buka `https://<laptop>.<tailnet>.ts.net`, pilih Tambahkan ke layar utama, lalu tekan Aktifkan pemberitahuan.

Untuk berhenti berbagi: `tailscale serve reset`. Jangan memakai `tailscale funnel` (itu membuka ke internet umum).

## Perintah lain

| Perintah | Isi |
|---|---|
| `npm run dev` | server (4780) + Vite (5173) untuk pengembangan |
| `npm run seed` | data contoh ke `data/demo.db` (jalankan server dengan `CREW_DB=data/demo.db`) |
| `npm test` | tes otomatis (claude tiruan, tanpa kuota) |
| `npm run typecheck` | cek tipe |
