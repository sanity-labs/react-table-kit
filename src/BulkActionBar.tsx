import {Card, Flex, Text} from '@sanity/ui'
import type {ReactNode} from 'react'

interface BulkActionBarProps {
  selectedCount: number
  children?: ReactNode
}

export function BulkActionBar({selectedCount, children}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  const label = selectedCount === 1 ? '1 document selected' : `${selectedCount} documents selected`

  return (
    <Card padding={3} tone="primary" data-testid="bulk-action-bar">
      <Flex align="center" gap={3} wrap="wrap">
        <Text size={1} weight="medium" style={{whiteSpace: 'nowrap'}}>
          {label}
        </Text>
        <Flex gap={2} wrap="wrap">
          {children}
        </Flex>
      </Flex>
    </Card>
  )
}
