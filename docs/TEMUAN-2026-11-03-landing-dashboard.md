# Temuan: kit lemah di landing dan dashboard (3 Nov 2026)

Sumber kasus: TOconnect (TryoutHub), revisi UI/UX 3 Nov. Keluhan pemilik: layar ngerjain tryout sudah cukup; landing tidak menarik dan tidak mendorong berlangganan; dashboard operator dan admin klien bikin pusing karena isinya list dan tabel penuh.
Dicek dari: isi kit (agent, command, skill), Flow Viewer (run `ui-direction` 3 Nov 09.23 dan run 3 Nov 12.43), web live (operator dan admin klien di dev lokal), screenshot audit landing 1 Nov, docs TOconnect (PRD, UX v1.5, DESIGN arah E, backlog).
Status: semua usulan 1-6 dikerjakan 3 Nov malam (lihat CHANGELOG "Agent ux per jenis layar" dan "UI per jenis layar"). Uji nyata: jalur pemasaran ux lulus (run 3 Nov 19.15, item ux-landing-ajakan); jalur dashboard ux, ui-designer per jenis, ui-direction baru, dan ui-critic baru belum diuji dengan run.

## Kesimpulan
Kit kuat untuk layar tugas (alur pendek, tenang, rapi, bebas pola template). Kit tidak punya lensa untuk dua jenis layar lain:
- **Landing/pemasaran**: tujuannya meyakinkan, bukan menyelesaikan tugas.
- **Dashboard**: tujuannya terbaca sekilas ("apa yang perlu diurus"), bukan daftar data.
Akibatnya dua area itu dirancang dengan aturan layar ujian, dan semua gate meloloskannya.

## Temuan
1. **Agent `ux` hanya mengukur jumlah langkah.**
   - `plugins/fullstack-dev/agents/ux.md` alur 2: "hitung langkah ... rancang versi terpendek". Tidak ada ukuran lain.
   - TOconnect UX.md T6: landing "2 langkah, sudah minimum" lalu dianggap selesai.
   - Audit UX v1.5 setelah pemilik bilang "jelek dari landing sampe semuanya": kesimpulannya "langkahnya sudah pendek", lalu hanya memperbaiki navigasi.
   - Tidak ada pertanyaan "kenapa pengunjung mau berlangganan" atau "apa yang harus terlihat di dashboard dalam 5 detik".

2. **`ui-direction` mempersempit jawaban pemilik ke satu layar kunci.**
   - `commands/ui-direction.md` langkah 2 mewajibkan satu layar kunci (a) + (b); landing hanya bila proyeknya memang landing.
   - Flow Viewer, run 3 Nov 09.23: ditanya layar kunci mana, pemilik menjawab **"semuanya"**. Orkestrator tetap memutuskan "pembangunan awal hanya layar pengerjaan soal peserta di 1440".
   - Arah E hanya diuji di layar soal dan hasil. Landing dan dashboard di DESIGN.md hanya teks "Meluas ke empat area, belum dirancang per layar".

3. **Prinsip "konsistensi menang atas kebaruan" ikut menyebarkan dial dan komposisi, bukan hanya token.**
   - `ui-designer.md` prinsip 3: bila DESIGN.md Approved, konsep, warna, font, radius, bayangan, dan nada tidak diganti.
   - Dial layar ujian ikut ke landing: ENERGY 2 / RHYTHM 3 / MOTION 3 (TOconnect DESIGN.md "Dial taste").
   - Pemilik memilih kesan "Modern dan berenergi" (opsinya berbunyi "progres dan statistik menonjol"), tetapi kesan itu hanya dijawab bilah bersegmen di layar soal.
   - Rencana E untuk operator tetap "tabel di kartu putih radius 16, baris 44px"; admin klien "baris dengan chip pastel dan bilah tipis". Bila dibangun, hasilnya ganti warna, tetap list dan tabel.

4. **Gate untuk landing dan dashboard hanya melarang, tidak mengarahkan.**
   - Isi kit tentang landing/dashboard hanya antislop: testimoni palsu, logo bar, harga 3 kolom, "Default Dashboard Shell", "Charts Without a Question" (antislop-ui).
   - Proyek tanpa klien nyata + PRD yang melarang harga dan pendaftaran = semua bagian peyakin terbuang. Sisanya lembar spesifikasi.
   - Dashboard menghindari grafik dan kartu stat karena takut slop, sehingga jatuh ke tabel.
   - `antislop-copywriting` sengaja tidak dipakai (doc kit, "Sengaja tidak dipakai"); itu satu-satunya skill tentang copy landing, value proposition, dan CTA.
   - ux-designer punya referensi `18-data-visualization.md` dan `21-data-tables.md`, tetapi tidak ada agent yang wajib membukanya untuk layar dashboard.

5. **`ui-critic` menilai hasil terhadap rencana, bukan terhadap tujuan layar.**
   - Landing TOconnect: FIX, skor hierarki 3, perbaikan berupa ukuran buku 3D, jarak, border (backlog `ui-critic-landing`, `fix-ui-landing`).
   - Rencana yang tidak berniat menjual tetap lolos, karena tidak ada uji "apakah ini meyakinkan" atau "apakah ini terbaca sekilas".

6. **Agent `prd` tidak menggali tujuan bisnis halaman pemasaran.**
   - TOconnect PRD F14: "memahami TryoutHub dan menghubungi operator", aksi tunggal "Hubungi kami". Tidak ada model langganan, paket, alasan memilih, atau bukti yang jujur yang bisa ditampilkan.
   - Non-goals melarang pendaftaran, form, pembayaran. Tidak ada pertanyaan ke pemilik soal apa yang membuat calon klien yakin.

## Risiko yang sedang berjalan di TOconnect
Item `ux-landing-ajakan` dan `ux-dashboard-operator-admin` (ditambah 3 Nov sore) dikerjakan agent `ux` yang lensanya masih jumlah langkah, dan item dashboard dibatasi "hanya susun ulang info, bukan fitur baru". Bila dijalankan sebelum kit diperbaiki, kemungkinan besar hasilnya rapi tetapi tetap tidak menjual dan tetap tabel. Saran: tahan dulu.

## Usulan perbaikan (belum diputuskan)
1. `ux`: tambah lensa per jenis layar. Landing: keberatan calon klien, bukti yang jujur, urutan argumen, tangga CTA. Dashboard: "apa yang harus terlihat dalam 5 detik", apa yang butuh tindakan, tabel sebagai detail sekunder. Wajib buka referensi ux-designer 18 dan 21 untuk dashboard.
2. `ui-direction`: arah divalidasi per jenis area (layar tugas / dashboard / pemasaran) bila pemilik memilih lebih dari satu area, atau minimal satu layar kunci per jenis area.
3. DESIGN.md: dial per jenis area (aplikasi, dashboard, landing). Prinsip konsistensi berlaku untuk token dan identitas, bukan dial dan komposisi.
4. Skill baru atau aktifkan ulang: copy/konversi landing (pertimbangkan `antislop-copywriting`) dan pola dashboard (fokus tindakan, ringkasan, visualisasi yang menjawab pertanyaan).
5. `ui-critic`: uji 5 detik untuk landing ("apa yang ditawarkan, kenapa saya, apa langkah berikutnya") dan uji perhatian untuk dashboard ("apa yang perlu diurus sekarang").
6. `prd` / `prd-review`: untuk halaman pemasaran, tanyakan tujuan bisnis (langganan, paket, harga atau tidak), siapa yang diyakinkan, dan bukti nyata apa yang tersedia.

## Tambahan: kenapa skill `ux-designer` tidak menolong (dicek 3 Nov malam)
- Pengetahuannya ada: `references/18-data-visualization.md` (hierarki dashboard: ringkasan dulu, tabel sebagai "details on demand", Shneiderman "overview first") dan `20-emotional-design.md` (sinyal kepercayaan, social proof jujur).
- Agent `ux` tidak memakainya. Flow Viewer, run audit UX v1.5 (3 Nov, id 1793684637222): agent `ux` membaca UX.md, PRD, PROJECT.md, screenshot, dan kode, tetapi **nol file referensi ux-designer**. Aturan "buka hanya referensi yang relevan" + alur yang hanya menghitung langkah = referensi tidak pernah dianggap relevan.
- Description skill dipersempit di 1.9.2 menjadi "flows, modal vs panel vs page, navigation, forms, states", jadi topik dashboard dan kepercayaan tidak terlihat dari luar.
- Skill ini sendiri berorientasi aplikasi: filosofi "Calm over clever", dan daftar yang dihindari memuat "Hero sections, testimonials, and marketing filler inside app UI". Tidak ada referensi tentang landing atau persuasi (grep "persua" = 0). Untuk landing, skill ini lemah walau dipakai penuh.
- Dashboard jatuh di celah dua agent: pola dashboard di referensi 18 (KPI di atas, grafik, tabel di bawah) dianggap tata letak, sedangkan `ux.md` "Batas peran" menyerahkan bentuk ke ui-designer. Di sisi ui-designer, antislop-ui "Default Dashboard Shell" melarang pola itu sebagai bawaan. Tidak ada yang memiliki keputusan "apa yang harus terlihat sekilas".
- Beda dengan UI: UI punya beberapa skill yang dimuat di langkah tertentu, ditambah audit dan kritikus yang memastikan aturan dipakai. UX hanya satu skill, referensinya opsional, dan tidak ada gate yang mengecek referensi itu dibuka.
