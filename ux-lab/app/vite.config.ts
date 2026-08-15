import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../../src', import.meta.url)),
      '~lab': fileURLToPath(new URL('./src', import.meta.url)),
      '@product': fileURLToPath(new URL('../../src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5201,
    strictPort: true,
    allowedHosts: ['terminal.local'],
    fs: { allow: [workspaceRoot] },
  },
})
