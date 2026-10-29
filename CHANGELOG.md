# Changelog

## 1.9.1 - 2026-10-29 (ui-designer-kit, fullstack-dev)

Dasar: cross-check skill terhadap agent dan repo sumber (tanpa uji jalan). Masalah utama: agent fullstack tidak punya tool `Skill` sehingga instruksi "muat skill X" tidak bisa dijalankan; jalur cepat ui-designer memuat antislop-ui tanpa core padahal Delivery Gate ada di core.

### Skill baru
- `antislop-layoutmobile` (anti-slop 5ca57fe): rancangan mobile 375 di langkah 2, checklist di langkah 5.
- `diagnosing-bugs` (mattpocock 59db609): be dan fe untuk item bug, retry, atau tes gagal tanpa sebab jelas.

### ui-designer
- Langkah 2 memuat antislop + antislop-ui + antislop-layoutmobile; rancangan layar wajib menulis apa yang berubah di 375.
- Jalur cepat dan `bangun arah X`: antislop-ui tanpa core memakai "UI Skill Checklist" sebagai gate (dulu meminta Delivery Gate yang tidak dimuat).

### fullstack-dev
- Tool `Skill` ditambahkan ke be, fe, qa, cyber, ux.
- architect: preload `security-checklists` untuk threat model.
- cyber: ponytail-review/audit tidak lagi di-preload; dimuat lewat Skill hanya di item `review-kode`/`audit-akhir`. Audit akhir mendaftar komentar `shortcut:`.
- ux: tidak lagi memuat ux-writing-id DAN -en; satu tambahan bahasa lewat Skill.
- fe: tdd lewat Skill untuk logika non-trivial; diagnosing-bugs untuk bug.
- qa: PRD dicari lewat project-context (tidak lagi dikunci `docs/PRD.md`), membaca `tdd/tests.md`, kutip galat utuh.
- backlog: mode sinkron mengumpulkan komentar `shortcut:` jadi item atau catatan audit-akhir (pengganti ponytail-debt).

### project-context
- Bagian 6: mode ringkas (caveman) tidak berlaku untuk dokumen `docs/`, laporan ke pemilik, teks UI, dan bukti.

Pasang ulang skill baru: jalankan lagi `install-global.ps1` (junction per folder; skill lama dilewati).
Cadangan file 1.9.0: `D:\01_Workspace\_diag\backup-1.9.0\`.

## 1.9.0 - 2026-10-28 (ui-designer-kit, fullstack-dev)

Dasar: dua uji landing page dengan 1.8.0. Token turun jauh (desainer 691k dan 7m40s, dari 5,71M dan 57m), tetapi hasilnya masih template. Log Flow Viewer menunjukkan akar masalahnya: orkestrator (sesi utama) menulis ulang permintaan pemilik menjadi brief yang sudah menentukan gaya ("matahari besar", "A serif krem, B grid dingin") dan menyuruh "tanpa dokumen tambahan". Desainer menuruti tugas itu dan melewati langkah Arah/Rancang, sehingga antislop tidak pernah dimuat dan tidak ada rancangan yang bisa dinilai kritikus. Kerangka section juga sudah dikunci di UX ("3 langkah", "6 butir").

### Orkestrator = kurir
- Hook SessionStart, `start`, `build`, `run`, `ui-direction`: ke ui-designer/ux/ui-critic hanya dikirim kata-kata pemilik apa adanya, path dokumen, dan lingkup. Dilarang menulis keputusan visual atau menyuruh melewati langkah/dokumen agent.

### ui-direction dua tahap
- Satu `ui-designer` (mode `konsep-3`) menulis tiga arah sebagai teks (`docs/mockups/arah-X/DESIGN.md` + `tokens.css`); ia yang menentukan perbedaannya, dan tiap arah menjawab SEMUA kesan pemilik.
- Tiga `ui-designer` paralel membangun masing-masing dari DESIGN.md arahnya, tanpa catatan gaya dari orkestrator.

### ui-designer
- Langkah Arah, Rancang, dan Cek tidak bisa digugurkan isi tugas; "tanpa dokumen/cepat" = ringkas, bukan dilewati. Arahan visual orkestrator = masukan.
- DESIGN.md + token selalu di folder kerja (mockup arah, sub-proyek seperti `docs/landing/`, atau `docs/`).
- Daftar bagian PRD/UX = daftar isi, bukan tata letak; desainer boleh menggabung, memecah, mengurutkan ulang, dan memilih bentuk. Rancangan per bagian wajib menyebut bukti visual; bagian teks-saja atau kartu seragam harus beralasan; konsep terlihat di lebih dari hero dan penutup.
- Bila Playwright tidak ditemukan: laporkan perintah pasang, jangan berburu di Temp/cache.

### ux
- Menentukan isi, urutan argumen, alur, dan state; bentuk visual (kartu, angka 1-2-3, grid) milik ui-designer.

### ui-critic
- Gerbang NO-PLAN: layar tanpa konsep atau rancangan tidak bisa lulus. Daftar bagian yang mengikuti PRD/UX satu-satu dengan bentuk seragam = GENERIC kecuali beralasan. Tidak mengambil screenshot sendiri.

### Audit ui-craft
- Playwright dipasang sekali di `skills/ui-craft` (`package.json`, install-global). Skrip mencetak perintah pasang yang tepat dan melarang pencarian di folder lain.

Cadangan file 1.8.0: `D:\01_Workspace\_diag\backup-1.8.0\`.

## 1.8.0 - 2026-10-27 (ui-designer-kit, fullstack-dev)

Masalah: lama walau hanya satu layar, boros token, hasil tidak konsisten dan sering norak. Penyebab yang ditemukan: arah visual diambil dari katalog gaya merek (bukan dari tugas pengguna), prinsip desain dimuat tapi tidak pernah dipakai di langkah mana pun, dan agent bekerja lewat ratusan giliran kecil (edit, screenshot, audit, ulang) yang masing-masing membaca ulang seluruh konteks.

### ui-designer
- `model: opus` dikunci.
- Alur baru: **arah** (kesan 3 kata pemilik + konsep 1 kalimat; referensi diambil prinsipnya, library hanya untuk token sesudah konsep, tidak lagi menyalin DESIGN.md merek) -> **rancang** (titik fokus, urutan baca, blok, yang sengaja tidak ada; ditulis sebelum kode) -> **token** di `docs/design-tokens.css` -> **bangun sekali** -> **cek sekali** (satu perintah audit + screenshot, cocokkan dengan rancangan, Delivery Gate antislop) -> **satu batch perbaikan**, maks 2 putaran.
- **Jalur cepat**: DESIGN.md Approved + edit tanpa ubah tata letak -> baca DESIGN.md, token, dan file layar saja; 1 audit, 1 putaran, tanpa kritikus.
- antislop dan antislop-ui tetap dipakai, dimuat di langkah rancang (mencegah, bukan menyaring).
- `ux-writing-id` dan `ux-writing-en` tidak lagi dimuat berdua; yang sesuai bahasa UI dipanggil saat menulis teks.
- Template DESIGN.md: bagian Status, Kesan, Konsep, Referensi (prinsip diambil/tidak), Rancangan layar, Istilah & nada, Pelanggaran disengaja.

### ui-critic
- Menilai hasil terhadap **konsep dan rancangan layar** (uji sipit mata, satu fokus, tutup logo), bukan hanya kecocokan token. Wajib 3 perbedaan konkret vs referensi pemilik bila ada.
- Memakai ulang `audit.json` desainer; skill dikurangi ke design-principles + ux-writing (bahasa yang sesuai via Skill), supaya sudut pandangnya beda dari desainer.
- Keluaran satu batch perbaikan; verdict PASS | FIX | GENERIC | DIRECTION. Hanya dipanggil untuk layar baru atau perubahan tata letak.

### Audit ui-craft (skill, berlaku lewat junction)
- `--tokens docs/design-tokens.css`: warna, radius, ukuran huruf, dan font di luar token jadi temuan; VERDICT GAGAL bila ada.
- Hitungan baru: keluarga huruf (maks 2), kelompok warna jenuh, grup kartu identik, dua kandidat fokus yang bersaing, luas blok warna jenuh di layar pertama.
- SKILL.md menegaskan: audit = perintilan; lulus audit tidak berarti desain bagus.

### fe
- Token dibaca dari `docs/design-tokens.css` (file yang sama dengan audit), bukan file token bebas.

### architect, qa
- architect tidak lagi menulis TASKS.md bila proyek memakai backlog (dulu dobel dengan `backlog.json`).
- qa memakai lebar mobile 375 seperti ui-designer (dulu 390).

### Orkestrasi
- `ui-direction`: 3 konsep pada **1 layar kunci desktop** (dulu 3 arah x 2 layar x 2 lebar + kritikus pada ketiganya); layar kedua, mobile, dan kritikus hanya untuk arah terpilih.
- `build`, `run`, `fe-only`, `start`, skill `backlog`: ui-critic per kelompok layar baru/ubah tata letak, perbaikan sebagai satu item batch.

Cadangan file 1.7.1: `D:\01_Workspace\_diag\backup-1.7.1\`.
