import { defineProject } from 'vitest/config'
import { resolve } from 'path'

const root = process.cwd()

export default [
  defineProject({
    test: {
      name: 'main',
      include: ['src/main/**/*.test.ts'],
      environment: 'node'
    },
    resolve: {
      alias: {
        '@renderer': resolve(root, 'src/renderer/src'),
        '@shared': resolve(root, 'src/shared')
      }
    }
  }),
  defineProject({
    test: {
      name: 'renderer',
      include: ['src/renderer/**/*.test.ts', 'src/renderer/**/*.test.tsx'],
      environment: 'jsdom',
      setupFiles: ['src/renderer/src/test-setup.ts']
    },
    resolve: {
      alias: {
        '@renderer': resolve(root, 'src/renderer/src'),
        '@shared': resolve(root, 'src/shared')
      }
    }
  })
]
