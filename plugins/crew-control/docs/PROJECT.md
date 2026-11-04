PRD: docs/PRD.md
Jenis proyek: web (dashboard lokal, server di laptop Windows pemilik)
Stack (dikunci di docs/ARCHITECTURE.md): Node 22 + TypeScript + Fastify, node:sqlite, zod (src/contract/), React + Vite + React Router + TanStack Query, @xyflow/react, SSE, Web Push; kendali lewat `claude` asli (stream-json + tuan rumah izin stdio + hook HTTP), tanpa Agent SDK
Bahasa UI: id
Port: 4780 (4777 milik Flow Viewer; 4781 hanya untuk spike)
Tahap terakhir selesai: backlog (docs/backlog.json, 87 item aktif, 0 selesai; 25 diparkir ke fase 2; diringkas dari 123 pada 2026-11-05). Fase 2 (pemilik 2026-11-05, tetap tercatat): F6 Pemberitahuan (nt*, sc06-push-fase2), F11 HP (hp*), F9 Kesehatan kit (kh*), F12 Riwayat (rw*). Rel navigasi menampilkan Riwayat dan Kesehatan kit bertanda "segera". Data fase 2 tetap dikumpulkan lengkap di MVP (dk01, dk02; tanpa pemangkasan). MVP fase 1 = F1-F5, F7, F8, F10, F13; F14-F16 Nanti tidak ada di backlog. Sebelumnya: arsitektur, desain arah B Approved, ux disetujui, PRD v1.0 Locked, spike + irisan tipis (docs/SPIKE.md)
Keputusan pemilik 2026-11-04: mulai 1 run aktif, uji tangan sesi desktop 2 menit, matikan Flow Viewer (docs/KEPUTUSAN.md)
Berikutnya: /fullstack-dev:run 5 (mulai dari item fondasi f01, f08)
