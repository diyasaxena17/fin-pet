import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const envDir = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  // Server-side only: Mochi's voice server passcode never reaches the browser.
  const env = loadEnv(mode, envDir, '');
  const voiceServer = env.MOCHI_VOICE_SERVER || 'https://mochi-pet-xi.vercel.app';
  return {
    plugins: [react(), tailwindcss()],
    envDir,
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://localhost:3000', changeOrigin: true },
        // Mochi's voices, chat and daily brief (the original Mochi app's /api/gemini and /api/market).
        '/mochi-voice': {
          target: voiceServer,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/mochi-voice/, '/api'),
          headers: env.MOCHI_PASS ? { 'x-mochi-pass': env.MOCHI_PASS } : {},
        },
      },
    },
    test: { environment: 'jsdom', clearMocks: true, restoreMocks: true },
  };
});
