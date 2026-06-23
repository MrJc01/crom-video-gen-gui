import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/templates': { target: 'http://localhost:3001', changeOrigin: true },
      '/assets': { target: 'http://localhost:3001', changeOrigin: true },
      '/output': { target: 'http://localhost:3001', changeOrigin: true }
    }
  }
})
