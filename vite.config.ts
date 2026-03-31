import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // API Key fixa conforme solicitado
    'process.env.API_KEY': JSON.stringify('AIzaSyBKPaQWWlTSBIZEOo1Alpe5I9cn9BiUOio')
  },
  build: {
    outDir: 'dist'
  }
});