import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'ghost-gl-core': path.resolve(__dirname, '../core/src/index.ts'),
      'ghost-gl-adapter-core': path.resolve(__dirname, '../adapter-core/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
