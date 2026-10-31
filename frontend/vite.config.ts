import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:8000';
  const proxy = Object.fromEntries(
    ['/api', '/static', '/admin'].map((path) => [path, { target, changeOrigin: true }]),
  );
  return {
    plugins: [react()],
    server: { host: '0.0.0.0', port: 5173, strictPort: true, proxy },
    preview: { host: '0.0.0.0', port: 4173, strictPort: true, proxy },
    test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], restoreMocks: true },
  };
});
