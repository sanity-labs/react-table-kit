import {Button, Card, Flex, Text} from '@sanity/ui'

import type {PaginationState} from '../../hooks/usePagination'

interface PaginationProps {
  pagination: PaginationState
}

/**
 * Pagination — page controls for the table.
 * Shows "Showing X-Y of Z documents" and Previous/Next buttons.
 */
export function Pagination({pagination}: PaginationProps) {
  const {startIndex, endIndex, totalItems, hasPreviousPage, hasNextPage, previousPage, nextPage} =
    pagination

  if (totalItems === 0 || totalItems <= pagination.pageSize) return null

  return (
    <Card padding={3} data-testid="pagination">
      <Flex align="center" justify="space-between">
        <Text size={1} muted>
          Showing {startIndex + 1}-{endIndex} of {totalItems} documents
        </Text>
        <Flex gap={2}>
          <Button text="Previous" mode="ghost" disabled={!hasPreviousPage} onClick={previousPage} />
          <Button text="Next" mode="ghost" disabled={!hasNextPage} onClick={nextPage} />
        </Flex>
      </Flex>
    </Card>
  )
}
