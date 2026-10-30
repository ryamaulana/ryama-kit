# Changelog

## Belum dirilis (fullstack-dev, ui-designer-kit, flow-viewer)

### Hemat token (fullstack-dev, ui-designer-kit)
Dasar: run TryoutHub (29-30 Okt): 166 juta token mentah untuk 33/147 item, limit tercapai dua kali. 94% dari empat agent opus: be 31% (621 giliran), ui-designer 28% (59 gambar, konteks 189k), orkestrator 26% (satu sesi untuk 6 batch, konteks 254k), architect 9% (5 putaran sinkron ulang).
- Orkestrator: satu sesi = satu batch. `run` berakhir dengan laporan maks 15 baris, satu pertanyaan commit lokal, lalu `/clear` + `/fullstack-dev:run`. Hook session-start ikut mengingatkan. Bukti dicek dengan output pendek (`ls`, tes paket `| tail`), bukan suite penuh atau screenshot.
- backlog.js: field `model` per item (validasi opus/sonnet/haiku), tampil di paket (`model=` + instruksi parameter Agent), `ready`, dan BACKLOG.md. Perintah baru `set <id,...> --model|--size` untuk item yang belum jalan. Paket item non-keputusan membawa aturan "Hemat token" (perintah digabung dan dipotong, baca per bagian, laporan maks 15 baris).
- be: bawaan sonnet; opus lewat `model` item untuk logika sulit. TDD per seam (tes satu seam sekaligus, lalu implementasi), bukan satu tes satu implementasi.
- ui-designer: `model: sonnet` untuk porting mockup Approved, perbaikan kritikus, dan jalur cepat; screenshot dibaca paling akhir, perbaikan non-layout dibuktikan dengan angka audit.
- agent backlog: mode "Atur model" untuk backlog lama.
- prd-review: temuan baru untuk format data masuk/keluar (file contoh asli wajib, tanpa itu = Tinggi) dan batas angka.

### Log token untuk AI (flow-viewer)
- `server/tokens.js` (baru): analisis transkrip per pemanggilan agent: ID item backlog (dari `ITEM <id>` di prompt), model, giliran, konteks awal/puncak/akhir, token per model, output tool terbesar yang masuk konteks (perkiraan karakter/4, gambar ~1.600), cache yang ditulis ulang (>= 20k dan >= 60% konteks giliran itu; biasanya setelah sesi menganggur), laporan subagent yang masuk ke orkestrator, dan pesan limit.
- Tiap agent menyimpan `invocations` (satu baris per pemanggilan); sesi utama menyimpan `main.tokens`. Token sesi utama sekarang dihitung sejak run mulai (dulu satu sesi yang melewati beberapa run dihitung penuh di tiap run).
- Waktu sesi utama aktif dicatat (`mainSegs`) untuk memisahkan kerja, menunggu pemilik, dan limit.
- `server/token-report.js` (baru) + `GET /report/tokens.md|.json?project=`: laporan per proyek lintas run (per run, per agent, pemanggilan termahal per item, orkestrator, output tool terbesar, waktu kerja/nunggu/limit, setara per item). Salinannya ditulis ke `<proyek>/.flow-viewer/laporan-token.md` (folder meng-ignore dirinya sendiri), diperbarui maksimal tiap menit saat sesi utama berhenti.
- `POST /history/rescan?id=`: analisis ulang run lama dari `events.jsonl` (path transkrip dan id agent dalam rentang waktu run). Tombol "Analisis" dan "Laporan" di tiap baris Riwayat; tab "Pemanggilan" di panel agent.
- Perbaikan: `server.js` membaca `skills:`/`tools:` berbentuk daftar YAML bertingkat (dulu kosong untuk be, qa, cyber). Modul `agents.js` sudah benar, tetapi server memakai pembacanya sendiri.
- Tes: `test/unit/tokens.test.js` (5 kasus); tes agents menyesuaikan be = sonnet.

### Riwayat run dibuka penuh lagi
- Tombol "Buka" di Riwayat memuat run lama ke kanvas dan semua panel (Chat, Backlog, File, Skill, Token, Agent, Log), seperti mode "Lihat" di 1.7.1. Bar "Melihat riwayat · hanya baca" berisi tombol Ringkasan dan Kembali ke live; Esc juga kembali ke live. Dulu v2 hanya membuka modal ringkasan.
- Server menyimpan detail per agent ke snapshot riwayat (tugas, hasil, 200 aktivitas terakhir, file). Run yang tersimpan sebelum perubahan ini hanya punya beberapa aktivitas terakhir per agent.
- Durasi run yang tidak ditutup dihitung sampai update terakhir, bukan sampai sekarang (dulu ringkasan menulis 21j 55m untuk run 17j 11m).

## 1.10.0 - 2026-10-29 (ui-designer-kit, fullstack-dev)

Persiapan masuk tahap build. Dasar: cross-check; bagian build (architect, backlog, be, fe, qa, cyber) belum pernah dijalankan di proyek mana pun.

### Jembatan mockup -> aplikasi
- ui-designer: bagian baru "Layar di aplikasi". Setelah boilerplate ada, layar dibangun sebagai komponen tampilan di framework aplikasi (porting mockup Approved = jalur cepat), token diimpor sekali, data lewat props, fixture untuk state kosong/memuat/galat, audit di halaman preview. Laporan menambah tabel "Kontrak komponen".
- fe: menyambung data, state, routing ke komponen itu tanpa mengubah markup/kelas/gaya; perubahan visual jadi item ui-designer.
- backlog: urutan dalam irisan = be + ui-designer (paralel) -> fe -> ui-critic -> qa.
- build `fe-only`: urutan ui-designer dulu, lalu fe.

### Kontrak dan lingkungan
- architect: modul kontrak bersama (zod per endpoint untuk TypeScript, `openapi.yaml` untuk lainnya), letak folder komponen tampilan vs container, bagian "Run locally" (tool, env var, migrate + seed, dev server, tes), dan "Deploy" ringkas.
- be: validasi dengan modul kontrak; perintah run lokal dan seed data realistis tetap jalan.
- fe: tipe diimpor dari modul kontrak.

### qa
- Model haiku -> sonnet.
- playwright-review ditulis ulang: locator berbasis peran/label, assertion web-first tanpa sleep, data tes mandiri + reset DB, storageState untuk login, webServer dari "Run locally", bukti galat utuh, flaky = gagal.
- App dijalankan dengan perintah "Run locally".

### Hook
- post-edit: pengingat UI hanya untuk sesi utama dan sekali per sesi; pengingat keamanan sekali per file dan tidak untuk cyber. Dulu muncul di setiap edit, termasuk di agent fe/ui-designer.
- session-start: PRD dibaca dari `docs/PROJECT.md` (tidak dikunci `docs/PRD.md`); di folder yang bukan proyek kit hanya satu baris.
- `boilerplate` dan `ui-only`: PRD dicari lewat project-context.

Cadangan file 1.9.2: `D:\01_Workspace\_diag\backup-1.9.2\`.

## 1.9.2 - 2026-10-29 (skills)

- Description dipersempit pada antislop, antislop-ui, antislop-layoutmobile, ponytail, ux-designer, ux-writing, diagnosing-bugs: menyebut agent pemakainya dan bahwa sesi utama/orkestrator mendelegasikan, bukan memuat sendiri. Mencegah orkestrator terpicu otomatis memuat skill desain lalu ikut mendesain. Isi skill tidak diubah; dicatat di SOURCE.txt masing-masing.
- ux-writing-id: description dibungkus tanda kutip. Teks "(bahasa Inggris: ux-writing-en)" membuat frontmatter tidak valid YAML, sehingga skill ini berisiko gagal terbaca.

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
