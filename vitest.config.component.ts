import react from '@vitejs/plugin-react'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'table-kit:component',
    include: ['**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
  },
})
