# 0002: Proyek ditentukan oleh sesi, bukan oleh cwd tiap event

Status: diterima · 2026-10-27

## Konteks
PRD A5 menetapkan kunci proyek = folder kerja (`cwd`). Field `cwd` di event hook mengikuti folder kerja saat itu, dan Claude bisa pindah folder di tengah sesi. Log nyata: 281 event dari `flow-viewer\docs\mockups` dan `flow-viewer\docs` dalam sesi yang dimulai di `flow-viewer`.

## Keputusan
`session_id` diikat ke proyek pada event pertamanya; event berikutnya mengikuti ikatan itu. Sesi yang belum terikat (mis. setelah server restart) diikat ke proyek yang sudah dikenal bila `cwd`-nya berada di dalam folder proyek itu; selain itu `cwd` menjadi proyek baru.

## Alternatif ditolak
- `cwd` tiap event (1.7.1): satu kerja pecah menjadi beberapa proyek palsu.
- Menurunkan proyek dari path transkrip (`~/.claude/projects/<slug>`): slug tidak bisa dibalik ke path dengan pasti.

## Konsekuensi
Ikatan ada di memori; setelah restart, proyek dipulihkan lewat aturan "di dalam folder yang dikenal" memakai daftar proyek di Riwayat. Sesi yang memang dimulai di subfolder tetap menjadi proyek sendiri.
