import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// Gera os PNGs (192/512/maskable/apple-touch) e favicon a partir do icon.svg.
// Rode com: npm run generate-icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/icon.svg'],
})
