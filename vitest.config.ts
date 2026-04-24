import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Include all test files matching these patterns
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Exclude output and node_modules
    exclude: ['out', 'node_modules']
  },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  }
})
