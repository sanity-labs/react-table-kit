import {AddIcon, CalendarIcon} from '@sanity/icons'
import {Box, Text} from '@sanity/ui'
import type {ReactNode} from 'react'

import {TableCellChrome} from './TableCellChrome'

interface DateCellShellProps {
  children: ReactNode
  onClick?: () => void
}

/**
 * Shared date-cell chrome that mirrors reference-cell treatment:
 * bordered card with a full-width button inside.
 */
export function DateCellShell({children, onClick}: DateCellShellProps) {
  return (
    <TableCellChrome
      dataTestId="date-cell-shell"
      leading={<CalendarIcon fontSize={24} />}
      onPress={onClick}
      state="filled"
      title={<div style={{minWidth: 0}}>{children}</div>}
    />
  )
}

export function DateEmptyState({onClick, text = 'Add...'}: {onClick?: () => void; text?: string}) {
  return (
    <TableCellChrome
      dataTestId="date-empty-state"
      leading={
        <Box
          style={{
            alignItems: 'center',
            background: 'var(--card-badge-default-bg-color, #e3e4e8)',
            borderRadius: '50%',
            color: 'var(--card-badge-default-fg-color, #515e72)',
            display: 'flex',
            flexShrink: 0,
            height: 24,
            justifyContent: 'center',
            width: 24,
          }}
        >
          <AddIcon />
        </Box>
      }
      onPress={onClick}
      state="empty"
      title={
        <Text muted size={1}>
          {text}
        </Text>
      }
    />
  )
}
