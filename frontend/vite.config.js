import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get backend URL from environment, default to localhost
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/outputs': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/bases': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
})
