import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // ideas/ holds local artifacts AND nested git worktrees of concurrent
    // sessions — scanning it re-runs (and cross-fails) their whole suites.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.claude/**', 'ideas/**'],
    pool: 'forks',
    threads: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

