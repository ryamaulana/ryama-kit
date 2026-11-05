// Pratinjau komponen ui/ dengan data contoh (bukan API). Buka /app/preview.html?tema=gelap untuk tema gelap.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/index.css';
import { AppShell, PageHead } from '../screens/AppShell.js';
import './preview.css';

const tema = new URLSearchParams(location.search).get('tema');
document.documentElement.dataset.theme = tema === 'gelap' ? 'dark' : 'light';

function Preview() {
  const [settings, setSettings] = useState(false);
  return (
    <AppShell
      nav={{
        current: 'proyek',
        needsYou: 2,
        settingsOpen: settings,
        onNavigate: (_dest, e) => e.preventDefault(),
        onOpenSettings: () => setSettings((s) => !s),
      }}
    >
      <PageHead title="Proyek" sub="D:\01_Workspace" subMono />
      <section className="pv-note" aria-labelledby="pv-judul">
        <h2 id="pv-judul">Pratinjau kerangka</h2>
        <p>Rel navigasi dan kepala halaman. Isi layar menyusul di item layarnya.</p>
        <p>Data contoh: 2 butuh kamu. Riwayat dan Kesehatan kit belum tersedia di fase ini.</p>
      </section>
    </AppShell>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
