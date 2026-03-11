import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/vue/') ||
              id.includes('/vue-router/') ||
              id.includes('/pinia/')
            ) {
              return 'vue-vendor'
            }

            if (id.includes('/dexie/')) {
              return 'dexie'
            }

            return 'vendor'
          }

          if (
            id.includes('/src/locales/')
          ) {
            return 'locales'
          }

          if (
            id.includes('/src/services/prompts/') ||
            id.includes('/src/services/chatPrompts.ts') ||
            id.includes('/src/services/cbtLLMAssists.ts') ||
            id.includes('/src/services/ifsLLMAssists.ts') ||
            id.includes('/src/services/logotherapyLLMAssists.ts')
          ) {
            return 'ai-prompts'
          }

          if (
            id.includes('/src/domain/exercises.ts') ||
            id.includes('/src/repositories/exercisesDexieRepository.ts') ||
            id.includes('/src/stores/wheelOfLife.store.ts')
          ) {
            return 'exercise-data'
          }
        },
      },
    },
  },
})
