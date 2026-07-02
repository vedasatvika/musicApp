import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // On GitHub Pages the app is served from /musicapp/, so assets need that
  // base. Locally (dev/preview) it stays at the root.
  base: process.env.GITHUB_PAGES ? '/musicapp/' : '/',
  server: {
    host: true,
    port: 5173,
  },
})
