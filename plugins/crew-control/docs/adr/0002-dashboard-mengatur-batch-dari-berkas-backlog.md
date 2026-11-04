# Dashboard yang mengatur batch, commit, dan keputusan backlog; orkestrator hanya mengerjakan satu batch

Batas batch, commit lokal, milestone, dan item keputusan pemilik diatur Conductor di dashboard dengan membaca `docs/backlog.json` sebelum dan sesudah tiap sesi, bukan dengan menafsirkan percakapan orkestrator. Alternatif yang ditolak: membiarkan orkestrator memutuskan sendiri kapan commit dan kapan berhenti (seperti `/fullstack-dev:run` hari ini), karena hasilnya hanya teks yang harus ditebak dashboard, dan pertanyaan keputusan dari orkestrator menahan seluruh sesi (AC F3 meminta item lain tetap jalan).

## Consequences
- Kit tim perlu mode `--crew` (lewati item keputusan, tanpa tanya commit) dan field `milestone/origin/fixOf` di skrip backlog; cara manual lama tetap bekerja.
- Tulisan dashboard ke `backlog.json` (jawaban keputusan, item perbaikan) hanya dilakukan saat tidak ada sesi yang berjalan di proyek itu, karena skrip backlog tidak mengunci berkas.
- Status milestone (usulan, disetujui, siap review) milik database dashboard; keanggotaan dan status item tetap milik `backlog.json`.
