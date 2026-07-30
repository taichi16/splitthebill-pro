import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // Relative base path for universal deployment (GitHub Pages, Vercel, PWA)
  server: {
    host: true,
    port: 5173,
    allowedHosts: true
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: '多人記帳拆帳 專業版',
        short_name: '記帳專業版',
        description: '專為手機輸入設計的多人記帳拆帳軟體，支援大人/小孩設定、夫妻檔歸併與按代付者直連歸還方案',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
