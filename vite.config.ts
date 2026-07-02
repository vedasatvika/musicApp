import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // On GitHub Pages the app is served from a repo-name subpath. Using a
  // relative base makes asset URLs work regardless of that path (and its
  // casing). The app has no client-side routing, so relative paths are safe.
  base: process.env.GITHUB_PAGES ? './' : '/',
  server: {
    host: true,
    port: 5173,
  },
})
