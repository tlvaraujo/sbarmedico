import { defineConfig } from 'vitest/config'

// Config de teste separada da vite.config para evitar o conflito de tipos
// entre a cópia de `vite` do vitest e a do projeto.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
