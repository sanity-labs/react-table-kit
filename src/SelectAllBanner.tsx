import {Button, Card, Flex, Text} from '@sanity/ui'

interface SelectAllBannerProps {
  pageCount: number
  totalCount: number
  isAllSelected: boolean
  onSelectAll: () => void
  onClearSelection: () => void
}

/**
 * Gmail-style banner that appears when all rows on the current page are selected
 * and more rows exist beyond the page. Offers to extend selection to all matching documents.
 */
export function SelectAllBanner({
  pageCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
}: SelectAllBannerProps) {
  // Don't show if all docs fit on one page
  if (totalCount <= pageCount) return null

  return (
    <Card
      padding={3}
      tone="transparent"
      data-testid="select-all-banner"
      style={{textAlign: 'center'}}
    >
      {isAllSelected ? (
        <Flex align="center" justify="center" gap={2}>
          <Text size={1}>All {totalCount} documents selected.</Text>
          <Button fontSize={1} mode="bleed" onClick={onClearSelection} text="Clear selection" />
        </Flex>
      ) : (
        <Flex align="center" justify="center" gap={2}>
          <Text size={1}>All {pageCount} documents on this page are selected.</Text>
          <Button
            fontSize={1}
            mode="bleed"
            tone="primary"
            onClick={onSelectAll}
            text={`Select all ${totalCount} documents`}
            aria-label={`Select all ${totalCount} documents`}
          />
        </Flex>
      )}
    </Card>
  )
}
