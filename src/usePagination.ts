import {useCallback, useState} from 'react'

export interface PaginationState {
  /** Current page (1-based) */
  page: number
  /** Items per page */
  pageSize: number
  /** Total number of items */
  totalItems: number
  /** Total number of pages */
  totalPages: number
  /** Start index (0-based) for slicing */
  startIndex: number
  /** End index (exclusive) for slicing */
  endIndex: number
  /** Go to next page */
  nextPage: () => void
  /** Go to previous page */
  previousPage: () => void
  /** Go to a specific page */
  goToPage: (page: number) => void
  /** Whether there is a next page */
  hasNextPage: boolean
  /** Whether there is a previous page */
  hasPreviousPage: boolean
}

export function usePagination(totalItems: number, pageSize: number = 50): PaginationState {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Clamp page to valid range
  const clampedPage = Math.min(page, totalPages)
  if (clampedPage !== page) {
    setPage(clampedPage)
  }

  const startIndex = (clampedPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const hasNextPage = clampedPage < totalPages
  const hasPreviousPage = clampedPage > 1

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages))
  }, [totalPages])

  const previousPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1))
  }, [])

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(Math.max(1, Math.min(newPage, totalPages)))
    },
    [totalPages],
  )

  const _resetToFirstPage = useCallback(() => {
    setPage(1)
  }, [])

  return {
    page: clampedPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    nextPage,
    previousPage,
    goToPage,
    hasNextPage,
    hasPreviousPage,
  }
}
