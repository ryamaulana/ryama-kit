# DESIGN: Flow Viewer (`plugins/flow-viewer/server/public/index.html`)

Status: draft ronde 3 (redesain ulang visual) + perbaikan ronde 1 ui-critic, belum Approved. Satu file HTML mandiri tanpa build; tema terang dan gelap (toggle `#theme`, kunci `fv-theme`). Bahasa UI: Indonesia.

## Arah: "meja kerja lembut"
Arah "papan sinyal" (rambu stasiun, sudut 2px, Barlow kapital, vermilion) DIBUANG atas penilaian pemilik. Arah baru berasal dari dua referensi dashboard workflow/agent (Workkora, OrchestrateIQ) dan dari versi lama yang disukai pemilik (navy gelap, node kartu, pita fase, ikon agent, panel samping).
- Kanvas abu sangat muda, kartu putih bersudut 12-16px dengan border tipis dan bayangan sangat lembut. Satu jangkar hitam pekat (tab aktif, tombol "Kembali ke live", brand), sisanya netral.
- Node = kartu kecil: ikon di chip, judul, satu baris status, satu baris aktivitas (mono), chip model. Pita fase = kolom tint lembut tanpa garis.
- Konektor tipis siku-halus tanpa pil di tengahnya (pil durasi dicoba lalu dihapus: terbaca sebagai latensi serah-terima dan menggandakan durasi di node).
- Tiga zona: tab dan ringkasan di atas, kanvas graf di tengah, inspektur di kanan (izin/berjalan, percakapan, file), plus laci detail melayang.
- Log sebagai tabel (No | Waktu | Jenis | Kejadian) dengan chip jenis.
- Dari versi lama dipertahankan kepribadiannya: navy gelap, kartu node, pita fase, ikon per agent, strip hasil per agent (gantt), panel samping; satu warna ungu hanya untuk identitas agent utama (Claude/orkestrator).
Dial: ENERGY 2 / RHYTHM 1 (alat kerja) / MOTION 2 (gerak hanya untuk yang hidup).

## Token
- Huruf (di-embed base64, offline, ~120 KB; lebar panel kanan default 320px): **Plus Jakarta Sans** variabel 400-700 (geometris humanis, dirancang untuk teks Indonesia, terbaca di 12-14px) untuk UI; **IBM Plex Mono** 400/500 hanya untuk ID, path, jam, tool, nama model, angka teknis. Barlow dihapus.
- Skala tipe (5 ukuran, tidak ada lainnya): 12 (label, meta, mono) / 14 (isi) / 16 (judul kartu, tab detail) / 20 (judul seksi) / 28 (hanya angka ringkasan halaman Token). Angka KPI strip Live 20/600 supaya tidak menyaingi graf. Bobot: 400, 600, 700 (700 hanya angka halaman Token dan merek).
- Spasi: 4, 8, 12, 16, 24, 32 (48 tidak diperlukan). Jarak dalam grup 4-12, antar grup 16-24, antar seksi 24-32.
- Radius: 8 (baris, kode, field kecil), 12 (kartu node, ubin stat, bubble), 16 (kartu/panel), pil 999 (chip, tombol, tab).
- Elevasi tiga tingkat: datar (kanvas dan pita), kartu (`--e1`: border 1px + bayangan 1px), melayang (`--e2`: menu, laci, kontrol zoom, hover node). Tidak ada bayangan lain.
- Warna terang: kanvas `#eff0f4`, kartu `#ffffff`, inset `#f4f5f8`, teks `#111827`, muted `#566175`, garis `#e2e5eb`, garis kuat `#8b94a6`, jangkar `#111827`.
- Warna gelap (navy bertingkat, bukan inversi): kanvas `#0a0e1b` < kartu `#151d33` < inset/hover `#1c2742`; teks `#eaeef8`, muted `#a7b1c9`, garis `#26314f`, garis kuat `#7280a3`, jangkar `#eaeef8` (teks jangkar `#0a0e1b`). Tint status gelap lebih gelap dan lebih jenuh rendah daripada terang.
- Maksimal 1 aksen + 4 status: aksen = ungu `#6d45e8` (terang) / `#a48dff` (gelap), hanya untuk identitas agent utama, cincin fokus, pilihan teks. Status: biru berjalan, hijau selesai, amber dilewati dan menunggu izin, merah galat. Abu = menunggu/di luar flow. Tiap status punya trio solid/tint/teks (`--run`, `--run-bg`, `--run-fg`, dst).
- Peran teks: utama, muted (alias `--dim`, `--fg2` = utama), status. Tidak ada abu ketiga.

## Bahasa status (satu kosakata: warna + ikon + border)
menunggu = pil abu + ikon lingkaran putus-putus + border solid tipis (bukan putus-putus); berjalan = pil biru + titik berdenyut; hanya node berjalan PALING BARU (kelas `.lead`, atau Claude utama bila tak ada agent berjalan) yang mendapat border biru + cincin beranimasi + tint 6%, node berjalan lain cukup pil biru; selesai = pil hijau + ikon centang-lingkaran + border solid hijau; dilewati = pil amber + ikon seru-lingkaran + border amber + tint 8% + konektor amber putus-putus; di luar flow/opsional = satu-satunya node dengan border putus-putus, latar inset, tanpa opacity (kontras tetap AA). Lencana bulat di pojok hanya untuk selesai (centang) dan dilewati (seru); berjalan tidak punya lencana. Port bulat hanya dirender di sisi yang benar-benar tersambung konektor. Konektor aktif hanya dari sumber done/running. Perubahan kecil logika kelas konektor: konektor ke node dilewati diberi kelas `skip` (amber putus-putus) dan konektor dispatch yang belum aktif memakai garis solid pudar, bukan titik-titik.

## Penerapan prinsip desain
| Prinsip | Penerapan |
|---|---|
| Satu titik fokus | Live: satu node berjalan terbaru (satu-satunya border biru + cincin bergerak, berapa pun agent yang berjalan) dan callout `#now`. `#now` berjalan dan menunggu kamu sama bentuknya: border 1,5px (biru / amber), ikon, judul 16/600; yang amber ditambah isi izin 14px. Status tidak mewarnai kontrol: tombol "Sembunyikan panel" tetap netral, hanya chip verdict "menunggu kamu" yang amber di header. Token: angka 28px; Backlog: kelompok "Nunggu owner" paling atas; Riwayat: baris live bertint biru; Laci: tab aktif (jangkar) dan blok "Bukti model". |
| Hierarki | Tiga tingkat tegas: judul seksi 20/600, judul kartu 16/600 (node 14/600), meta 12 abu. Angka KPI 28/700 adalah satu-satunya ukuran besar. Label seksi kecil kapital abu hanya untuk label KPI, label pita fase, kepala tabel, label kelompok backlog. |
| Warna hemat | 1 aksen + 4 status; ikon agent netral (tint mengikuti status); chip model netral (bentuk ikon + teks, bukan warna); batang token deret satu abu 4 tingkat dengan legenda berlabel. |
| Skala | Tipe 5 ukuran, spasi 4/8/12/16/24/32, radius 8/12/16/pil, 3 elevasi; token dipakai lewat variabel CSS, tidak ada nilai lepas kecuali ukuran komponen (32/36/44px). |
| Proximity | Judul seksi 12px dari isinya, antar seksi 24px; baris node: ikon+nama+status satu kelompok, aktivitas dan chip model kelompok kedua; grup backlog 24px antar kelompok, 12px antar item. |
| Alignment | Kolom pita fase sama lebar (kartu 224 + celah 48, margin pita 24), tepi kiri kartu = label pita; grid KPI 4 kolom sama lebar; semua halaman penuh memakai lebar kartu 1080 yang sama. |
| Ritme vertikal | Strip KPI -> Alur kerja -> Hasil per agent berjarak 24px konsisten; baris graf 132px kartu + 44px celah. |
| Kontras dan sentuh | Audit ui-craft: 0 temuan tinggi/sedang di terang dan gelap, 375 dan 1440. Tab, ikon, tombol zoom, tutup laci, tombol riwayat min 44px di mobile. Fokus: cincin ungu 2px offset 2px, tidak pernah dihapus. |
| Tema gelap | Tiga permukaan (kanvas < kartu < inset), tint status ditulis ulang, jangkar dibalik (putih di navy), bayangan lebih pekat. |
| Konsistensi | Semua chip = pil 20px; semua kartu = 16px; status memakai satu komponen `.stx` di node, kartu hasil, laci, dan banner. |
| Hindari slop | Tanpa gradien, tanpa emoji, tanpa grid titik, tanpa glass, tanpa kartu-dalam-kartu (inspektur kanan satu panel dengan bagian dipisah ruang dan garis tipis), tanpa bayangan berat. |

## Titik fokus per layar
- Live: node berjalan + `#now`. Strip KPI sengaja tenang (kartu putih, angka 28px, tanpa warna).
- Mobile 375: tab jadi grid 3x2 (semua tab terlihat, tanpa scroll tersembunyi); tab laci grid 2x2 dengan label "Hasil" (kunci JS `tugas` tidak berubah). Urutan `#now` (izin/berjalan) -> KPI 2x2 -> Alur kerja (daftar kartu berurut menurut fase, dengan judul fase INPUT/SPESIFIKASI/BANGUN/VERIFIKASI 12px kapital seperti pita fase 1440) -> Hasil per agent -> Percakapan -> File. Panel samping tetap bisa dibuka/ditutup lewat tombol ikon.

## Istilah & nada
berjalan / menunggu / selesai / dilewati / di luar flow; satu istilah untuk giliran pemilik: "Menunggu kamu" (chip verdict, judul `#now`: "Menunggu kamu: beri izin" / "Menunggu kamu: jawab pertanyaan"); kelompok backlog "Perlu keputusanmu", "Berjalan / siap"; "Sembunyikan panel" / "Tampilkan panel"; "Alur kerja" (graf), "Hasil per agent", "Percakapan", "File diubah", "Riwayat run", "Log kejadian". Sapaan "kamu", kalimat pendek, tanpa slogan. Teks ronde ini: judul "Alur kerja", subjudul "Pilih satu langkah untuk melihat detail", kepala tabel log (Waktu, Jenis, Kejadian; kolom No dibuang karena nomornya bergeser tiap kejadian baru), jenis log (mulai, selesai, skill, flow, prompt, berhenti, sesi) dengan nama agent lewat dname() dan tanpa mengulang kata kerja chip, "skill dipanggil", "280k token mentah", "agent tercatat", "Salinan dari Claude Code, hanya baca", zoom "97% (manual)", pil backlog "menunggu <judul item>" (bukan id), baris "Prompt:" dan chip header kosong disembunyikan bila tak ada isi, banner offline "Terputus dari server. Menyambung ulang otomatis; data di layar mungkin sudah lama.", "Belum ada kejadian.".

## Keadaan
Memuat/terputus: kartu `.boot` + banner amber `#offline`. Kosong: teks per area. Hover node/kartu: naik 2px + border lebih tegas + bayangan melayang. Fokus keyboard: node dan kartu hasil bisa Tab, Enter/Spasi membuka laci, Escape menutup. Reduced-motion mematikan animasi.

## Pelanggaran disengaja
- Label kapital ber-letter-spacing hanya untuk label seksi kecil (KPI, pita fase, kepala tabel, kelompok backlog).
- Temuan rendah audit `copy-tombol` (node/kartu hasil berperan tombol dan berisi banyak teks) dan `copy-ulang` (data uji berulang): tidak diperbaiki.
- Zoom otomatis punya lantai 0,95 (teks efektif >= 11,4px); di panggung sempit graf bisa digeser horizontal. Terukur: 1440 -> zoom 0,97 (11,6px), 1280 -> 0,95 (11,4px), 1920 -> 1,15.
- Warna ungu aksen dipakai di tiga tempat saja (identitas agent utama, fokus, seleksi); tidak dipakai sebagai status.

## Decision log
- Ronde 3: arah "papan sinyal" dibuang; arah "meja kerja lembut" dari referensi pemilik. Palet navy gelap dari versi lama dipertahankan.
- Palet kiri (node library) pada referensi tidak ditiru: tidak ada datanya di server dan fitur tidak boleh ditambah.
- Ronde 1 critic (GAGAL pada uji satu fokus dan teks graf): KPI diturunkan ke 20/600; fokus hanya satu node berjalan terbaru; status tidak lagi ditulis tiga kali (border + pil + lencana: lencana hanya selesai/dilewati); node menunggu bergaris solid; port hanya di sisi tersambung; pil durasi konektor dihapus; GX 72->48, LP 36->24 (LP 16 membuat pita fase pertama terpotong), panel kanan 376->320, lantai zoom 0,95 (dipakai di semua lebar panggung graf, bukan hanya >= 900, karena panggung laptop 1280 hanya 896px).
- Opacity untuk node "di luar flow" diganti border titik + latar inset karena opacity menurunkan kontras di bawah AA.
- Regresi lama `#chatcard` meluap di <=900px diperbaiki: pada mode kolom semua bagian panel `flex:none`, tinggi chat dibatasi `max-height`, dan tiap bagian jadi kartu sendiri karena `aside` memakai `display:contents`.
