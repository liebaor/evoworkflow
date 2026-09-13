import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      reporter: ['text', 'html'],
    },
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
})
