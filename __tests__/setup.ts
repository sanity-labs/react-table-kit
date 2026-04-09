import {cleanup} from '@testing-library/react'
import {afterEach} from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock window.matchMedia — required by Sanity UI's Popover/MenuButton components
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

afterEach(() => {
  cleanup()
})
