import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'ghost-gl-core': path.resolve(__dirname, '../core/src/index.ts'),
      'ghost-gl-adapter-core': path.resolve(__dirname, '../adapter-core/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: [],
  },
})
