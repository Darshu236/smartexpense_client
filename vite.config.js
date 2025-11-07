import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make process.env available in the browser
    'process.env': process.env
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})


