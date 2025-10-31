import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/outputs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/bases': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
