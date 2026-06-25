import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [react()],
  resolve: {
    alias: {
      '@inventari/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react-router') || id.includes('react-router-dom')) {
            return 'router'
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query'
          }
          if (id.includes('react-dom') || /\/react\//.test(id)) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
