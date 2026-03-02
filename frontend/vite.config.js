import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Con Laravel Herd: en frontend/.env pon VITE_BACKEND_URL=http://helpdex.test (o el dominio que hayas enlazado)
const backendUrl = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
