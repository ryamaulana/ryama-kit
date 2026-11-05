import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = 'http://127.0.0.1:4780';

export default defineConfig({
  root: __dirname,
  base: '/',
  plugins: [react()],
  resolve: { alias: { '@contract': path.resolve(__dirname, '../src/contract/index.ts') } },
  server: { port: 5173, proxy: { '/api': api, '/hook': api } },
  build: { outDir: 'dist', emptyOutDir: true },
});
