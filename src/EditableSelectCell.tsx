import {Menu, MenuButton, MenuItem} from '@sanity/ui'
import {CheckmarkIcon} from '@sanity/icons'
import {useOptimisticValue} from './useOptimisticValue'
import type {DocumentBase} from './types'

/**
 * EditableSelectCell — renders a cell with a MenuButton dropdown for inline editing.
 * Uses Sanity UI MenuButton/Menu/MenuItem for proper ARIA, keyboard support, and floating-ui positioning.
 * The Linear model: single click opens the control immediately, no intermediate "edit mode."
 *
 * Supports optimistic updates: when a value is selected, the cell immediately reflects
 * the new value. The optimistic override is cleared when the real data arrives (detected
 * by the `value` prop changing to match the optimistic value).
 */
export function EditableSelectCell<T extends DocumentBase>({
  value,
  row,
  options,
  onEdit,
  cellRenderer,
  columnId,
}: {
  value: unknown
  row: T
  options: {value: string; label: string; tone?: string}[]
  onEdit?: (document: T, newValue: string) => void
  cellRenderer: (value: unknown, row: T) => React.ReactNode
  columnId: string
}) {
  const [displayValue, setOptimistic] = useOptimisticValue(value)
  const currentValueStr = String(displayValue ?? '')

  const handleSelect = (newValue: string) => {
    setOptimistic(newValue)
    onEdit?.(row, newValue)
  }

  return (
    <MenuButton
      id={`edit-${columnId}-${row._id}`}
      button={
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
          onMouseDown={(e) => {
            e.currentTarget.style.opacity = '0.5'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.opacity = '0.7'
          }}
        >
          {cellRenderer(displayValue, row)}
        </button>
      }
      menu={
        <Menu>
          {options.map((option) => {
            const isSelected = option.value === currentValueStr
            // All items get CheckmarkIcon for consistent layout — hide it on non-selected via visibility
            const Icon = () => (
              <CheckmarkIcon style={{visibility: isSelected ? 'visible' : 'hidden'}} />
            )
            return (
              <MenuItem
                key={option.value}
                text={option.label}
                icon={Icon}
                onClick={() => handleSelect(option.value)}
              />
            )
          })}
        </Menu>
      }
      popover={{animate: true, placement: 'bottom-start'}}
    />
  )
}
