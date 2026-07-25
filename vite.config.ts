import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base: './' → funciona tanto hospedado num subcaminho (GitHub Pages)
// quanto no build single-file offline.
//   npm run build          → dist/ (PWA instalável, hospedado)
//   npm run build:single   → dist-single/index.html (um arquivo só, offline)
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    build: single ? { outDir: 'dist-single' } : {},
    plugins: [
      react(),
      tailwindcss(),
      ...(single
        ? [viteSingleFile()]
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
              manifest: {
                name: 'SBAR Médico',
                short_name: 'SBAR',
                description:
                  'Passagem de plantão (SBAR) — dados 100% no seu aparelho.',
                lang: 'pt-BR',
                start_url: './',
                scope: './',
                display: 'standalone',
                orientation: 'portrait',
                background_color: '#0f172a',
                theme_color: '#0f8168',
                categories: ['medical', 'productivity'],
                icons: [
                  { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                  {
                    src: 'maskable-icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                  {
                    src: 'icon.svg',
                    sizes: 'any',
                    type: 'image/svg+xml',
                    purpose: 'any',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
              },
              devOptions: { enabled: true, type: 'module' },
            }),
          ]),
    ],
  }
})
