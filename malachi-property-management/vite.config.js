import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Malachi Property Management',
        short_name: 'Malachi',
        description: 'Property management, built for landlords — track tenants, contracts, and payments across every property you own.',
        theme_color: '#b5573a',
        background_color: '#1c1712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Firebase Auth/Firestore/Storage calls must always hit the network —
        // caching them would show stale tenant/payment data or break auth.
        // Only the app shell (JS/CSS/HTML/icons) gets cached for offline use.
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    host: true,
  },
})
