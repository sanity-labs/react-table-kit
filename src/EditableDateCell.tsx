import {useEffect, useRef, useState} from 'react'

import type {DocumentBase} from './types'
import {useOptimisticValue} from './useOptimisticValue'

/**
 * EditableDateCell — renders a cell that toggles between formatted date display and a date input.
 * Click to edit, change event saves immediately, Escape to cancel.
 * Supports optimistic updates.
 */
export function EditableDateCell<T extends DocumentBase>({
  value,
  row,
  onEdit,
  cellRenderer: _cellRenderer,
  columnId: _columnId,
}: {
  value: unknown
  row: T
  onEdit?: (document: T, newValue: string) => void
  cellRenderer: (value: unknown, row: T) => React.ReactNode
  columnId: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayValue, setOptimistic] = useOptimisticValue(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => {
    setIsEditing(true)
  }

  const handleChange = (newDate: string) => {
    setIsEditing(false)
    setOptimistic(newDate)
    onEdit?.(row, newDate)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={String(displayValue ?? '')}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            handleCancel()
          }
        }}
        style={{
          font: 'inherit',
          fontSize: '13px',
          padding: '4px 8px',
          border: '1px solid var(--card-border-color)',
          borderRadius: '4px',
          background: 'var(--card-bg-color)',
          color: 'var(--card-fg-color)',
        }}
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
