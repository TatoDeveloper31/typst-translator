import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['tato1-pc.local'],
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
