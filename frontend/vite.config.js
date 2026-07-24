import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Absolute base so asset URLs (/assets/…) resolve correctly from ANY route
  // (deep links like /students, /superadmin/login). Relative './' breaks on
  // nested paths once the SPA fallback serves index.html.
  base: '/',
})
