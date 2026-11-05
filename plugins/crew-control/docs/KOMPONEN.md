# Indeks komponen tampilan (`web/src/ui/`)
Satu baris per komponen. Gaya: `web/src/ui/styles/index.css` (tokens.css impor `docs/design-tokens.css` + font Overpass lokal, base.css), diimpor sekali di `web/src/main.tsx`. Tema: `data-theme="light|dark"` di `<html>` (tanpa atribut = ikut sistem). Pratinjau: `/app/preview.html?tema=terang|gelap`.

| Komponen | File | Props utama | Dipakai untuk |
|---|---|---|---|
| NavRail | `ui/screens/NavRail.tsx` | `current: NavDest\|null`, `needsYou: number`, `hrefs?`, `soon?: NavDest[]` (bawaan riwayat, kesehatan: tampil "segera", tidak bisa dibuka), `settingsOpen`, `onNavigate(dest, e)`, `onOpenSettings()` | Rel navigasi kiri laptop: Run baru, Proyek + lencana Butuh kamu, Riwayat, Kesehatan kit, Pengaturan |
| AppShell | `ui/screens/AppShell.tsx` | `nav: NavRailProps`, `children`, `panel?`, `skipLabel?` | Kerangka halaman: tautan lompat + rel + `<main id="isi">` |
| PageHead | `ui/screens/AppShell.tsx` | `title`, `sub?`, `subMono?`, `actions?` | Kepala halaman 56: judul = nama entitas, baris kedua path/ringkasan |
