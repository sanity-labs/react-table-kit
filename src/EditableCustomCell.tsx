import {useEffect, useState} from 'react'

import type {DocumentBase} from './types'
import {useOptimisticValue} from './useOptimisticValue'

/**
 * EditableCustomCell — renders a cell that opens a developer-provided editor.
 * Click to open, developer controls save/cancel via onChange/onClose callbacks.
 * Supports optimistic updates.
 */
export function EditableCustomCell<T extends DocumentBase>({
  value,
  row,
  onEdit,
  cellRenderer,
  _columnId,
  editComponent: EditComponent,
}: {
  value: unknown
  row: T
  onEdit?: (document: T, newValue: string) => void
  cellRenderer: (value: unknown, row: T) => React.ReactNode
  columnId: string
  editComponent: (props: {
    value: unknown
    document: T
    onChange: (newValue: string) => void
    onClose: () => void
  }) => React.ReactNode
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayValue, setOptimistic] = useOptimisticValue(value)

  const handleOpen = () => {
    setIsEditing(true)
  }

  const handleChange = (newValue: string) => {
    setIsEditing(false)
    setOptimistic(newValue)
    onEdit?.(row, newValue)
  }

  const handleClose = () => {
    setIsEditing(false)
  }

  // Handle Escape key at the cell level
  useEffect(() => {
    if (!isEditing) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing])

  if (isEditing) {
    return (
      <EditComponent
        value={displayValue}
        document={row}
        onChange={handleChange}
        onClose={handleClose}
      />
    )
  }

  return (
    <button
      type="button"
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '4px',
        transition: 'opacity 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.7'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
      onClick={handleOpen}
    >
      {cellRenderer(displayValue, row)}
    </button>
  )
}
