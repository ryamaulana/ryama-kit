import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = 'http://127.0.0.1:4780';

export default defineConfig({
  root: __dirname,
  // Sementara dilayani di /app/ di samping web lama; item hapus-web-lama memindahkannya ke akar.
  base: '/app/',
  plugins: [react()],
  resolve: { alias: { '@contract': path.resolve(__dirname, '../src/contract/index.ts') } },
  server: { port: 5173, proxy: { '/api': api, '/hook': api } },
  // Entri app.html karena web/index.html lama masih dipakai; ganti ke index.html saat web lama dihapus.
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: path.resolve(__dirname, 'app.html') } },
});
