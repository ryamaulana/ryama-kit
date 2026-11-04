# DESIGN · Arah B "Peta jalur"

Status: Draft (konsep-3, menunggu pemilik memilih) · 2026-11-04
Token mesin: `docs/mockups/arah-b/tokens.css` · Data mockup: `docs/mockups/data-mockup.md`

## Kesan (3 kata)
**tenang · hidup · akrab** (asumsi, minta konfirmasi). Tenang dari Linear, hidup dari n8n (hanya yang aktif menyala), akrab dari aplikasi Claude (pertanyaan berupa percakapan).

## Konsep
Crew Control terasa seperti **peta jalur kereta di peron**, karena pemilik terutama ingin tahu "kerjaan sudah sampai stasiun mana, dan di mana ia berhenti menunggu saya"; ini terlihat dari **grafik bergaya peta jalur (stasiun bulat di garis tebal; ruas yang sudah dilewati abu tua, ruas yang sedang jalan biru dan paling tebal)**, **progres milestone sebagai deret 24 stasiun kecil di bar atas**, dan **stasiun bercincin oranye yang warnanya sama dengan kartu pertanyaannya di Chat**.

## Cara arah ini menjawab ketiga kesan
- **Tenang:** rel yang belum dilewati berwarna abu, stasiun tanpa kotak, dan nama ditulis kecil di bawahnya; satu bahasa bentuk (lingkaran) dipakai di semua layar.
- **Hidup:** titik "kereta" berjalan di ruas biru, dan cabang paralel terlihat sebagai dua rel yang menyala berdampingan.
- **Akrab:** pertanyaan tetap berupa pesan di Chat. Stasiun bercincin oranye di peta menunjuk ke pesan itu dengan warna dan bentuk yang sama, jadi pemilik diajak bicara, bukan dikagetkan alarm.

## Jawaban untuk 3 pertanyaan pemilik
1. **Siapa yang kerja (3 detik):** di peta, hanya ruas dan stasiun Jalan yang biru dengan titik "kereta" bergerak; cabang paralel (fe dan be) terlihat sebagai dua rel biru berdampingan. Kolom kiri memakai bulatan yang sama dan baris kedua berisi item yang dikerjakan.
2. **Ada yang nanya:** stasiun agent itu bercincin oranye di peta, baris agent paling atas di kolom kiri, dan kartu pertanyaan di Chat bertepi oranye; tiga tempat, satu warna, satu bentuk.
3. **Sudah sampai mana:** deret 24 stasiun di bar atas (terisi tinta = selesai, biru = sedang dikerjakan, cincin = sisa) + teks "7/24 item · batch 2"; di peta, ruas bertinta = langkah alur yang sudah lewat.

## Beda dengan arah A dan C
| Aspek | B (ini) | A | C |
|---|---|---|---|
| Struktur | Grafik dominan (~760); Chat 376; kolom agent 248 dengan item | Chat terlebar | Kolom agent terlebar |
| Huruf | Overpass + Overpass Mono (asal huruf rambu jalan) | Plus Jakarta Sans + Commit Mono | Atkinson Hyperlegible Next + Mono |
| Suhu warna | Dingin (abu kebiruan, tinta biru-hitam) | Hangat krem | Netral monokrom |
| Kepadatan | Sedang (baris 36) | Rendah | Rapat tenang |
| Grafis | Peta jalur: lingkaran, garis 3 px, cabang paralel | Node pil, garis rambut | Node teks tanpa kotak |
| Bentuk | Lingkaran sebagai motif + sudut kecil 4/8 | Bulat lembut | Tajam |

## Referensi
| Referensi | Prinsip yang diambil | Yang TIDAK diambil |
|---|---|---|
| n8n, tampilan eksekusi | Graf sebagai tulang layar; node tersambung; yang aktif menyala dan bergerak, sisanya abu | Kartu node berikon, kanvas bertitik, warna per jenis node |
| Aplikasi Claude (chat) | Pertanyaan dan izin sebagai pesan; tombol pilihan langsung kirim; kotak ketik selalu ada | Palet dan tipografi Claude |
| Linear | Sedikit garis dan kotak; hierarki lewat bobot huruf dan abu | Tema gelap-ungu, Inter, tata letak Linear (R-30) |
| Flow Viewer v2 (ditolak) | Pelajaran: node maks 3 info; tidak ada kotak pemberitahuan di atas | Banner, kotak bergaris di semua panel, padat merata |

Library `~/.claude/design-library/` tidak dibuka; token diturunkan dari konsep dan diuji kontras.

## Dial per jenis area
| Jenis | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | ENERGY / RHYTHM / MOTION | Alasan |
|---|---|---|---|---|---|
| Dashboard | 5 | 3 | 5 | 2 / 2 / 2 | Peta adalah pusat; satu gerak bermakna (kereta di ruas aktif) |
| Layar tugas | 3 | 2 | 4 | 1 / 2 / 1 | Tugas pendek; peta tidak muncul, motif lingkaran tetap di status |

## Rancangan layar: Layar proyek (layar kunci)
- **Jenis:** dashboard + tugas (Chat). Dial baris Dashboard.
- **Pertanyaan:** apa yang sedang dikerjakan, dan apakah ada yang menunggu saya?
- **Titik fokus:** kartu pertanyaan/izin yang menunggu (tepi oranye) di Chat, diperkuat stasiun bercincin oranye di peta. Tanpa yang menunggu: ruas biru di peta. Alasan: konsep "di mana kereta berhenti menunggu saya".
- **Urutan baca:** 1. kartu menunggu · 2. ruas biru di peta (siapa kerja) · 3. deret 24 stasiun di bar atas · 4. kolom agent untuk rincian item.
- **Blok (1440: rel 56 | agent 248 | peta ~760 | Chat 376):**
  - Bar atas 56: nama proyek 18/600 + path · status · deret 24 stasiun + "7/24 item · batch 2" · token · durasi · [Jeda] [Stop].
  - Kolom agent: bulatan status 12 px (sama dengan stasiun) + nama + status; baris Jalan dan Butuh kamu menambah item yang dikerjakan. Kelompok Selesai/Siap dilipat jadi "4 selesai · 3 siap" yang bisa dibuka.
  - Peta: alur tim dari kiri ke kanan mengikuti definisi tim (F1), dipusatkan vertikal di kanvas; ruas dan stasiun Selesai `--text-2` 3 px (lebih ringan dari biru), ruas Jalan `--run` 4 px dengan titik kereta, Butuh kamu cincin oranye 3 px, Siap cincin abu; label nama di bawah stasiun, kata status + putaran di bawah nama ("Jalan · putaran 3"), dan untuk agent Jalan satu baris langkah alat mono 13 `--text-3` (maks 1 baris per agent). Tidak ada kotak di sekitar stasiun dan tidak ada daftar langkah di bawah peta.
  - Chat: permukaan putih; kartu menunggu bertepi oranye 2 px (penanda keadaan, bukan hiasan).
- **Konsep terlihat di:** peta jalur, deret stasiun progres, bulatan status di kolom kiri dan HP.
- **Sengaja tidak ada:** banner, kartu KPI, kotak node, ikon per agent, kanvas grid, legenda besar (status dibaca dari kata di bawah stasiun).
- **Keadaan (data asli 07_Sandbox):** prompt bebas tanpa milestone, jadi deret stasiun diganti "Prompt bebas · 9 langkah". (a) pertanyaan warna: stasiun orkestrator bercincin oranye; (b) izin Write `D:\luar-tes.txt`; (c) Dijeda: ruas biru berhenti dan berubah putus-putus abu, status "Dijeda", tombol "Lanjut"; (d) Dihentikan: ruas berhenti di stasiun orkestrator dengan tanda kotak abu, pesan sistem di Chat, kotak ketik diganti "Run dihentikan. Mulai run baru untuk lanjut." + [Run baru].
- **Keadaan berat (data contoh):** dua rel biru paralel (fe x3, be x2), stasiun ui-designer bercincin oranye, 4 stasiun bertinta (prd, ux, architect, backlog), 3 cincin abu (ui-critic, qa, cyber).
- **Mobile 375 (HP):** Chat penuh layar. Kepala: kembali, nama, status, [Jeda] [Stop] 44 px; baris kedua "7/24 item" + deret stasiun dipadatkan jadi garis 24 ruas. Baris "Agent: 2 jalan · 1 butuh kamu" dengan deret 10 bulatan status (bukan peta); ketuk membuka daftar. Tab bawah disembunyikan; kotak ketik menempel bawah.

## Rancangan layar: Layar proyek, HP 375 (`layar-proyek.html`, < 900 px)
- **Jenis:** tugas (Chat) dengan ringkasan dashboard di kepala; dial baris Layar tugas (tanpa peta, PRD F11). Tugas: jawab pertanyaan/izin dan kendalikan run dari HP.
- **Titik fokus:** kartu pertanyaan bertepi oranye di Chat; Chat dibuka tergulir ke bawah supaya kartu terlihat tanpa menggulir. Bulatan oranye pertama di baris Agent menggemakannya.
- **Urutan baca:** 1. kartu menunggu · 2. kepala (nama, status, Jeda/Stop) · 3. garis 24 ruas "UI · 7/24 item" · 4. baris Agent.
- **Blok atas ke bawah:** kepala 2 baris [kembali 44 | nama 18 + "● Jalan · Data contoh" | Jeda Stop 44] (kendali run harus satu ketuk) · progres: teks 13 + garis 24 ruas selebar layar (ruas lewat tebal 4 px tinta/biru, sisa tipis 2 px abu, sama dengan rel peta yang belum dilewati) · baris Agent 44: 10 bulatan + "2 jalan · 1 butuh kamu", ketuk membuka daftar status singkat (pengganti kolom kiri) beserta token, durasi, tim · Chat mengisi sisa layar · kotak ketik menempel bawah dengan safe area.
- **Konsep terlihat di:** garis ruas progres (rel), bulatan status di baris Agent dan daftarnya, cincin oranye di kartu.
- **Sengaja tidak ada:** peta, rel navigasi, tab bawah (sesuai rancangan HP layar ini), tab Detail, daftar langkah di bawah peta, penanda "1 menunggu kamu" di kepala (sudah dibawa baris Agent dan kartu yang terlihat).
- **Lebar 600-899:** tata letak yang sama; isi Chat dan kotak ketik dibatasi `--measure-chat` dan diletakkan di tengah supaya baris tidak terlalu panjang.

## Rancangan layar: (c) Daftar proyek `/` (`daftar-proyek.html`)
- **Jenis:** dashboard, dial baris Dashboard (5 / 3 / 5; ENERGY 2, RHYTHM 2, MOTION 2: tanpa gerak terus-menerus di layar ini, kereta hanya di peta). Jalur penuh (dashboard pertama di daftar).
- **Pertanyaan:** proyek mana yang butuh saya sekarang? **Titik fokus:** cincin oranye + "Butuh kamu" + tombol [Jawab] pada baris teratas (toconnect). Alasan: konsep "di mana kereta berhenti menunggu saya"; angka ringkasan hanya melapor.
- **Urutan baca:** 1. baris toconnect (cincin oranye) · 2. dua baris masalah lain (Siap review, Gagal) dengan tombolnya · 3. kolom jalur yang sejajar (sejauh mana tiap proyek) · 4. deret 5 angka di kepala · 5. proyek diam.
- **Blok 1440 (rel 56 | isi):** kepala: "Proyek" 18/600 + label data contoh, deret 5 angka sebaris (simbol stasiun 12 + angka 18/600 + label 14, angka 0 diciutkan, tiap angka tautan ke kelompoknya; versi awal angka 28 merebut fokus dari baris toconnect, jadi dikecilkan) dan [Run baru] tinta; satu baris tenang "Pemberitahuan ke HP belum aktif." + [Aktifkan] (bisa ditutup). Angka run di kepala berlabel "Run aktif 2/3" (slot run dari batas 3; toconnect ikut dihitung walau menunggu), beda kata dari kelompok "Jalan" karena maknanya beda. Lalu **papan jalur**: kepala kolom menyatu dengan judul kelompok pertama (Perlu diurus · Keadaan · Milestone · Run · Terakhir) dan tiga kelompok: *Perlu diurus* (permukaan putih, baris 72), *Jalan* (permukaan putih, baris 72; judul "Jalan 1" menghitung proyek berkeadaan Jalan saja; katalog-toko di bawah subjudul abu "Jeda limit 1" di kelompok yang sama), *Diam* (langsung di latar, baris 44, tanpa deret, abu).
- **Bentuk per angka:** keadaan = simbol stasiun 16 (cincin oranye Butuh kamu; cincin tinta ganda Siap review = stasiun akhir milestone; cincin merah + silang Gagal/Terputus; isi biru Jalan; cincin abu putus Jeda limit) + kata; progres milestone = deret titik 6 px, satu titik satu item, kiri rata di kolom yang sama (panjang deret = ukuran milestone, posisi biru = di mana kerja sekarang), teks "UI · 7/24 item · batch 2" di bawahnya; token dan durasi = teks angka tabular. Kartu angka menjawab "berapa yang menunggu"; papan menjawab "yang mana".
- **Konsep terlihat di:** simbol stasiun per baris, deret milestone yang sejajar seperti papan keberangkatan, titik Gagal sebagai stasiun bersilang di posisi item yang gagal, angka Butuh kamu di rel = angka di kepala.
- **Sengaja tidak ada:** kartu proyek berjejer, grafik, banner, ikon per proyek, kalimat penjelas di bawah angka, "semua aman".
- **Keadaan:** kosong ("Belum ada run." + [Run baru], tanpa angka), memuat (kerangka baris seukuran baris akhir), galat polling (satu baris di kepala "Tidak bisa memuat ulang. Ini data terakhir pukul 10.48.", data lama tetap), semua diam (tanpa kelompok Perlu diurus). Dibuka lewat `?keadaan=kosong|memuat|galat|diam`.
- **Mobile 375:** rel diganti tab bawah (Proyek, Run baru, Riwayat) 56 + safe area; kepala: judul + ikon Pengaturan 44. Angka jadi kisi 3 kolom tanpa batas langsung di `--bg` (simbol 12 + angka 18/600 + label 13, tinggi 44, angka 0 diciutkan, "lanjut 17.00" disembunyikan); "Perlu diurus" mulai di y 228. Baris proyek menumpuk: simbol + nama + tombol aksi 44 di baris 1, keadaan di baris 2, deret milestone jadi garis ruas selebar layar + teks milestone di baris 3; kolom Run dan Terakhir dilipat ke baris keadaan. Kepala kolom disembunyikan. 900-1279: kolom Run disembunyikan, isinya pindah ke baris kedua Keadaan.
- **Aksi:** [Jawab] terisi oranye (satu-satunya tombol oranye di layar = titik fokus), [Review] dan [Lanjutkan] bergaris, "Lihat alasan" tautan; seluruh baris membuka Layar proyek.
- **Token tambahan:** `--row-proj` 72, `--row-proj-quiet` 44, `--pip` 6, `--tabbar-h` 56, kolom papan `--col-proj-state` 216 · `--col-proj-track` 236 · `--col-proj-run` 168 · `--col-proj-time` 88 · `--col-proj-act` 132.
- **Data:** `data-mockup.md` bagian 4 (toconnect sama dengan Layar proyek: 1 menunggu, 412,6 rb, 1 j 48 mnt; 07_Sandbox asli; sisanya data contoh berlabel).

## Rancangan layar: (b) Review milestone (`review-milestone.html`)
- **Jenis:** layar tugas dengan ringkasan angka (UX 3). Dial baris Layar tugas (3 / 2 / 4; ENERGY 1, RHYTHM 2, MOTION 1). Tugas: menilai 24 item dari bukti, lalu Setujui atau Kirim perbaikan (T5, T5b).
- **Titik fokus:** bukti di galeri (gambar, diagram, grafik, hasil tes); hanya itu yang berukuran besar. Satu aksi tinta: [Setujui]. Alasan: pemilik menilai dari bukti, bukan dari log (UX T5).
- **Urutan baca:** 1. judul "Review · UI" + Setujui · 2. ringkasan angka satu baris (konteks: berapa item, berapa tanpa bukti/hilang, pembanding) · 3. jalur 24 item (di mana yang tanpa bukti, hilang, sudah dicatat) · 4. galeri per batch. Ringkasan sengaja di atas jalur karena angkanya menjelaskan tanda di jalur; ukurannya 16/600, lebih tenang dari bukti.
- **Blok 1440 (rel 56 | isi maks 1280):** kepala (tautan proyek, judul 18, status Siap review, [Kirim perbaikan (n)] [Setujui]) · ringkasan satu baris teks, bukan kartu: item + tanpa bukti, token vs UI sebelumnya, waktu vs UI sebelumnya, commit + file (PRD F7) · jalur item: rel 3 px bertinta dengan 24 stasiun-tombol dikelompokkan per batch, nomor item di bawah · galeri per batch (judul batch + commit + jumlah file), 3 kolom, kartu radius 8 dengan bukti 16:10 di atas, nomor + judul + agent + jenis bukti + keterangan satu kalimat, "Minta perbaikan" di kaki sebagai tombol teks tanpa batas (`--text-2`, tinggi 36, garis bawah saat hover). Batas tinta 3 px hanya pada kartu yang sudah diberi catatan.
- **Bentuk bukti per jenis (F8):** gambar/mockup = screenshot (klik = lihat penuh); Mermaid = diagram SVG dirender; data grafik = garis bertinta dengan label langsung; hasil tes = angka lulus/gagal + nama berkas tes; ringkasan diff/temuan = daftar pendek. Tanpa bukti: area bukti kosong bergaris putus-putus + kalimat. Hilang: path yang hilang, dengan simbol stasiun Gagal (cincin `--bad` 2 px + silang, sama dengan Daftar proyek) di jalur, legenda ("Berkas hilang"), dan judul kartu. Besar: pratinjau + [Buka berkas asli].
- **Konsep terlihat di:** jalur item (review = menyusuri stasiun yang sudah dilewati), bulatan di depan judul kartu, cincin putus-putus = tanpa bukti di jalur dan di kartu, cincin tinta tebal = sudah diberi catatan, di jalur dan di kartu.
- **Sengaja tidak ada:** kartu KPI, grafik ringkasan, filter/sortir (24 item cukup disusuri), biru (tidak ada yang Jalan), oranye (bukan "butuh kamu" dari agent; layar ini sendiri adalah tugasnya), kolom agent dan peta.
- **Mobile 375:** rel navigasi hilang; kepala: tautan "toconnect" 44 px + judul + status; ringkasan jadi dua baris teks 14 ("24 item · 2 tanpa bukti · 1 hilang" / "1,32 jt token · 5 j 50 mnt · 5 commit"), pembanding UI sebelumnya di panel yang dibuka ketukan; jalur diganti bilah lengket "Item 6 dari 24" + garis 24 ruas (posisi item saat ini 4 px `--ink`, sisanya 2 px abu, berkas hilang `--bad`); bukti pertama mulai di y 240; kartu satu kolom; [Kirim perbaikan (n)] [Setujui] menempel di bawah (48 px, ruang bawah dicadangkan).
- **Keadaan (hash di URL mockup):** `#memuat` kerangka kartu sebesar kartu akhir · `#galat` satu catatan di atas + [Coba lagi] · `#kosong` "Belum ada milestone untuk direview." + tautan proyek · `#disetujui` baca saja + "Disetujui 4 Nov, 16.20". Interaksi: Minta perbaikan -> catatan di kartu -> tombol kepala menghitung; Setujui dengan catatan belum dikirim -> konfirmasi kecil; klik bukti -> lihat penuh dengan Sebelumnya/Berikutnya/Esc.
- **Data:** DATA CONTOH (milestone UI 24 item, 5 batch, toconnect), berlabel di layar. Gambar bukti = screenshot `layar-proyek.html` arah ini, disimpan di `bukti-contoh/`.

## Wujud arah per jenis layar
- **Dashboard · (c) Daftar proyek (layar kunci berikutnya):**
  - Kepala: 5 angka dalam satu deret label + angka Overpass 600 (angka 0 diciutkan); [Run baru] tinta.
  - Tiap proyek satu baris: cincin oranye + jumlah "butuh kamu" di depan nama, nama + path, lalu deret stasiun milestone mini selebar tetap (24 titik 6 px, rata pada kolom yang sama). Karena posisinya sejajar, progres semua proyek bisa dibandingkan sekali lirik. Urutan mengikuti UX 6.1 (perlu diurus, jalan, diam); proyek diam tanpa deret, abu.
  - Fokus: cincin oranye pada baris teratas.
  - HP: deret stasiun menjadi garis ruas selebar layar di bawah nama; baris 64.
- **Dashboard · Kesehatan kit:** 6 angka Overpass 28 + pembanding; grafik token per milestone sebagai garis dengan titik stasiun per milestone; milestone sejenis yang dibandingkan berupa garis abu.
- **Tugas · (b) Review milestone (layar kunci berikutnya):**
  - Kepala: "Review · UI", ringkasan (item, tanpa bukti, token dan waktu vs milestone sejenis), [Setujui] tinta + [Kirim perbaikan (n)].
  - Di bawah kepala ada deret stasiun item milestone yang sama dengan bar atas Layar proyek. Satu stasiun = satu item; klik stasiun melompat ke kartunya. Stasiun item tanpa bukti berupa cincin putus-putus, dan stasiun yang sudah diberi catatan perbaikan bercincin tinta tebal.
  - Galeri: kartu sudut 8 dengan gambar dominan, label item dengan bulatan status, keterangan satu kalimat; 3 kolom di 1440.
  - Konsep: review = menyusuri stasiun yang sudah dilewati.
  - HP: deret diganti penghitung "3 dari 24"; kartu satu kolom; aksi menempel bawah.
- **Tugas · Run baru:** kotak ketik putih di tengah latar abu dingin; chip perintah; tombol folder menampilkan jejak path sebagai "stasiun" kecil (01_Workspace › clients › toconnect).
- **Tugas · Riwayat:** tabel baris 36, status dengan bulatan.
- **HP umum:** bulatan status sebagai bahasa tunggal di semua daftar; tanpa peta.

## Warna (peran, terang / gelap)
| Token | Terang | Gelap | Peran |
|---|---|---|---|
| `--bg` | #F1F3F5 | #171B21 | latar, kanvas peta |
| `--surface` | #FFFFFF | #1E232A | Chat, popover, kotak ketik |
| `--sunk` | #E6EAEE | #13171C | rel navigasi, hover |
| `--line` | #D6DCE2 | #2E353E | pemisah halus |
| `--edge` | #7D8894 | #6F7A86 | rel peta yang belum dilewati, batas tombol (3:1) |
| `--text` / `--text-2` / `--text-3` | #141A21 / #46515D / #5A6571 | #EEF1F4 / #B9C1CA / #98A2AD | utama / sekunder / redup |
| `--ink` | = `--text` | = `--text` | tombol utama, item review ada bukti |
| `--run` / `--run-soft` | #1F5BD1 / #E2EAFB | #7AA7FF / #1B2A45 | Jalan: ruas aktif, kereta |
| `--ask` / `--ask-soft` | #AD3A0A / #FDE7DB | #FF9A62 / #3D2216 | Butuh kamu: cincin, tepi kartu, teks |
| `--bad` / `--bad-soft` | #A3122A / #FBE3E7 | #FF8A9A / #3D1A22 | Gagal, Terputus (selalu dengan ikon silang) |

Aturan: aksen yang disengaja = **biru ruas aktif** (hidup); oranye hanya untuk Butuh kamu. Aksi utama = tinta. Selesai di peta = `--text-2` (rel yang sudah dilewati, lebih ringan dari ruas biru), bukan hijau. Gelap = slate, bukan hitam.

## Tipografi
- **Overpass** (400, 600, 700) untuk semua teks dan angka; **Overpass Mono** (400) untuk path, perintah, dan nama alat. Alasannya, Overpass diturunkan dari huruf rambu jalan raya (Highway Gothic), sehingga label stasiun, path, dan angka terbaca sebagai satu papan petunjuk, sesuai konsep peta jalur. Keluarga Red Hat di draf awal diganti karena huruf itu identitas merek lain.
- Skala: 12 / 13 / 14 / 16 / 18 / 28. Label stasiun 13; teks UI 14; Chat 16; nama proyek 18; angka besar 28 (Kesehatan kit).
- Line-height 1.45 (Chat 1.55), judul 1.2. Angka `tabular-nums`.

## Spasi, layout, bentuk
- Skala 4: 4 · 8 · 12 · 16 · 24 · 32 · 48. Baris agent 36; jarak antar stasiun peta minimum 96 horizontal, 56 antar rel paralel.
- Breakpoint menurut isi: ≥ 1280 penuh; 1024-1279 kolom agent menjadi 64 (bulatan + inisial nama, nama penuh di tooltip dan Detail) supaya peta tetap lega; < 900 tata letak HP.
- Radius: 4 (tombol, chip, input), 8 (kartu Chat, popover), 999 hanya untuk stasiun dan bulatan status. Bayangan: hanya popover.
- Garis peta 3 px (`--track-w`); ruas Jalan 4 px (`--track-live`) supaya terbaca kedua setelah kartu oranye; rel paralel berjarak 56.

## Komponen inti
- **Stasiun:** lingkaran 16 (Selesai terisi `--text-2` + centang 10 px; Jalan terisi biru + titik kereta 6 px di ruas sebelumnya; Butuh kamu cincin oranye 3 px + "?" 10 px; Gagal cincin merah + silang; Siap cincin abu 2 px). Label: nama 13/500, status 12 abu, "x3" bila berulang.
- **Baris agent:** bulatan 12 + nama + status; baris kedua (item) 13 abu hanya untuk Jalan/Butuh kamu.
- **Kartu pertanyaan/izin:** permukaan putih, tepi 2 px oranye, radius 8; pertanyaan 16/700; pilihan = tombol garis 4 radius dengan keterangan 13; izin menampilkan blok mono berlatar `--sunk`.
- **Kartu terjawab, pesan sistem:** satu baris 13 abu; pesan sistem di tengah dengan bulatan kecil tinta di depannya.

## Motion
120-200 ms ease-out untuk interaksi. Satu gerak terus-menerus: titik kereta 6 px berjalan di ruas biru (1,6 dtk, linear), hanya saat run Jalan. Butuh kamu diam. `prefers-reduced-motion`: titik kereta disembunyikan, ruas tetap biru.

## Istilah & nada
- Run, Proyek, Folder kerja, Butuh kamu, Pertanyaan, Izin, Milestone, Batch, Bukti (UX.md 10). Kata "stasiun" hanya istilah desain, tidak tampil di UI.
- Status: Jalan · Butuh kamu · Siap · Selesai · Gagal · Dilewati · Dijeda · Jeda limit · Siap review · Dihentikan · Terputus.
- Kendali: Jeda · Lanjut · Stop · Lanjutkan. Izin: Setujui · Tolak · Selalu setujui.
- Sapaan "kamu"; tanpa tanda seru; tombol 1-3 kata; waktu "14.37"; token "1,2 rb".
- Penanda: "1 menunggu kamu ↓". Kotak ketik: "Tulis ke orkestrator".

## Larangan khusus
- Tidak ada kotak di sekitar stasiun; info stasiun maks 3 (nama, status, putaran).
- Biru hanya untuk Jalan; oranye hanya untuk Butuh kamu.
- Tidak ada banner atau kartu KPI. Data contoh selalu berlabel.

## Pelanggaran disengaja
| Temuan audit | Di mana | Alasan |
|---|---|---|
| copy-ulang "Bash npm test -- runs" (rendah) | `layar-proyek.html`: baris langkah di Chat dan baris alat di bawah stasiun be | Baris langkah di Chat dilipat (riwayat percakapan); baris di peta adalah keadaan saat ini. Sumber datanya sama, tempatnya berbeda |
| copy-tombol 5-6 kata (rendah) | baris agent di kolom kiri | Seluruh baris adalah tombol pembuka Detail; isinya data (nama, status, item), bukan label aksi |
| Titik tengah "·" diganti bulatan 4 px (`.sep`, aria-hidden) | semua teks berpemisah | Glyph titik tengah Overpass menempel ke kata sesudahnya. Bulatan juga mengulang motif stasiun |
| titik-fokus h1 "toconnect" vs kartu pertanyaan (rendah) | `layar-proyek.html` @375 | Ukuran huruf hampir sama (18 vs 16/700), tetapi kartu membawa tepi oranye 2 px dan menempati sepertiga layar; h1 18 tetap dipakai agar sama dengan laptop |
| titik-fokus: 4 (1440) / 7 (375) tombol berlatar solid (sedang) | `daftar-proyek.html` | Di 1440: + rel dan [Run baru] adalah aksi global yang sama (DESIGN: Run baru tinta), [Jawab] adalah fokus. Di 375 (kini 0 sedang) lima angka tanpa latar di `--bg`; satu-satunya warna jenuh adalah [Jawab] |
| kandidat fokus h1 "Proyek" vs angka "1" (rendah) | `daftar-proyek.html` | Skrip mengukur ukuran huruf; fokus dirancang pada tombol oranye [Jawab] + cincin oranye baris toconnect, yang terbaca pertama di kedua screenshot |
| kartu-seragam 63 (rendah) | `daftar-proyek.html` | Yang terhitung adalah baris daftar dan titik deret milestone, bukan kartu fitur; baris berbeda tinggi per kelompok (72 / 44) |
| Path proyek diam terpotong dengan elipsis di laptop | `daftar-proyek.html` kelompok Diam | Baris diam 44 px satu baris; nama tetap utuh, path lengkap di `title` dan di HP |
| Baris Agent HP: "1 butuh kamu · 2 jalan" (urutan dibalik dari UX 8) | `layar-proyek.html` < 900 | Butuh kamu dibaca lebih dulu, sama dengan urutan kolom kiri (UX 6.2) |
| titik-fokus: 7 tombol berlatar solid di 1440, 4 di 375 (sedang) | `review-milestone.html` | Yang terhitung adalah area bukti (tombol "lihat penuh" berlatar `--sunk`) + [Run baru] di rel; satu-satunya tombol tinta di isi adalah [Setujui] |
| copy-tombol 6-16 kata (rendah) | `review-milestone.html`, area bukti | Seluruh bukti adalah tombol pembuka Lihat penuh; nama aksesnya `aria-label` "Lihat penuh: <judul item>", teks di dalamnya adalah isi bukti |
| kartu-seragam 19 (rendah) / copy-ulang "Agent tidak menyimpan hasil…" (rendah) | `review-milestone.html` | Galeri bukti memang koleksi sejenis (PRD F7); hierarki datang dari isi bukti dan bulatan status. Kalimat tanpa bukti sama untuk dua item karena keadaannya sama |
| big-n 28/700 hasil tes jadi "elemen terkuat" | `review-milestone.html` | Angka lulus adalah bukti itu sendiri (fokus rancangan = bukti); 28 adalah ukuran angka besar di skala |

## Decision log
| Tanggal | Perubahan | Alasan |
|---|---|---|
| 2026-11-04 | Arah B ditulis (konsep-3) | Brief pemilik: Claude, n8n, Linear; tolak v2 |
| 2026-11-04 | Dilengkapi: blok kesan, wujud layar (b) Review dan (c) Daftar proyek + HP; huruf Red Hat diganti Overpass | Brief pemilik: tiap arah menjawab semua kesan; layar kunci tahap berikutnya |
| 2026-11-04 | Mockup `layar-proyek.html` (1440, keadaan berat) dibangun; huruf disimpan lokal di `fonts/` | `bangun arah B`. Peta dibuat dua baris: baris 1 perencanaan (prd sampai backlog), rel membelok, lalu baris 2 batch (ui-designer, fe/be paralel, ui-critic, qa, cyber). Alasannya, 9 posisi dengan jarak min 96 tidak muat dalam satu baris selebar 712 |
| 2026-11-04 | `layar-proyek.html` responsif: HP < 900 (Chat penuh layar, kepala 2 baris, garis 24 ruas, baris Agent dengan daftar lipat); token `--tap`, `--seg-thin`, `--measure-chat` | Pemilik memilih arah B. Satu berkas supaya HP dan laptop tidak bercabang. Ikut diperbaiki: bar atas melebar ke 1391 px di 900-1279 (path dan token/durasi disembunyikan < 1280, deret stasiun < 1200; teks "UI · 7/24 item" tetap) |
| 2026-11-04 | Mockup `daftar-proyek.html` (c) Daftar proyek, 1440 + 375 + 900-1279; data contoh di `data-mockup.md` bagian 4; token papan ditambah | Layar dashboard kedua setelah arah B dipilih. Papan jalur: deret milestone sejajar per proyek; masalah ditandai di barisnya, tanpa kartu angka |
| 2026-11-04 | Mockup `review-milestone.html` (b) Review milestone, 1440 + 375 + 900-1279; gambar bukti contoh di `bukti-contoh/` (screenshot `layar-proyek.html`); screenshot audit di `screenshots/review/` | Layar tugas pertama. Jalur 24 item per batch di bawah kepala; galeri per batch. Tanpa token baru. Setujui di mockup menampilkan keadaan "Disetujui" di tempat (aplikasi asli kembali ke Layar proyek, UX T5) |
| 2026-11-04 | Perbaikan dari ui-critic (satu putaran, 7 butir + copy + opsional Kirim). Review: berkas hilang = simbol Gagal + legenda + ruas `--bad` di HP; Minta perbaikan jadi tombol teks, batas tinta hanya kartu bercatatan; ringkasan HP dua baris + panel pembanding; ruas posisi 4 px; hint kepala dihapus; urutan baca ringkasan di posisi 2. Daftar proyek: "Jalan 1" + subjudul "Jeda limit 1"; angka kepala "Run aktif 2/3"; angka HP kisi 3 kolom tanpa batas; pemberitahuan satu kalimat. Layar proyek: ruas Selesai `--text-2` 3 px, ruas Jalan 4 px (token baru `--track-live`); blok "Langkah yang sedang jalan" dihapus, diganti satu baris alat mono di bawah fe/be; peta dipusatkan; label "Jalan · putaran n"; Kirim pesan tenang (`--sunk`) saat kotak kosong | Kritik: titik berkas hilang sama dengan Ada bukti; angka Jalan beda arti; ruas Selesai lebih berat dari biru; blok di luar Rancangan; 24 tombol bergaris; kepala HP terlalu tinggi |
