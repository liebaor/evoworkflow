import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      include: ['src/**/*.ts'],
      reporter: ['text', 'html'],
    },
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
})
