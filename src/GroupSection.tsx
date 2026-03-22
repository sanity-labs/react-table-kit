import {Badge, Card, Checkbox, Flex, Label, Text} from '@sanity/ui'
import {flexRender, Row} from '@tanstack/react-table'
import {motion} from 'framer-motion'

import type {DocumentBase} from './types'

/** Group section with header and collapsible rows */
export function GroupSection<T extends DocumentBase>({
  groupName,
  rows,
  isCollapsed,
  onToggle,
  gridTemplateColumns,
  reorderable,
  columnPositionMap,
  isDragging,
  isResizing,
  hasSelection,
  rowSelection,
  onSelectGroup,
}: {
  groupName: string
  rows: Row<T>[]
  isCollapsed: boolean
  onToggle: () => void
  gridTemplateColumns: string
  reorderable?: boolean
  columnPositionMap: Record<string, number>
  isDragging: boolean
  isResizing: boolean
  hasSelection?: boolean
  rowSelection?: Record<string, boolean>
  onSelectGroup?: (rows: Row<T>[]) => void
}) {
  const allInGroupSelected =
    hasSelection && rows.length > 0 && rows.every((row) => rowSelection?.[row.id])
  const someInGroupSelected =
    hasSelection && rows.some((row) => rowSelection?.[row.id]) && !allInGroupSelected
  const selectedInGroupCount = hasSelection
    ? rows.filter((row) => rowSelection?.[row.id]).length
    : 0

  return (
    <>
      <Card
        paddingY={1}
        role="row"
        data-testid="group-header"
        onClick={onToggle}
        tone="primary"
        style={{
          display: 'grid',
          gridTemplateColumns,
          cursor: 'pointer',
          borderBottom: '1px solid var(--card-border-color)',
        }}
      >
        <div role="cell" style={{gridColumn: '1 / -1', padding: '12px 16px'}}>
          <Flex gap={4}>
            {hasSelection && (
              <span onClick={(e) => e.stopPropagation()} className="flex items-center">
                <Checkbox
                  checked={!!allInGroupSelected}
                  indeterminate={!!someInGroupSelected}
                  onChange={(_e) => {
                    onSelectGroup?.(rows)
                  }}
                  aria-label={`Select all in ${groupName}`}
                />
              </span>
            )}
            <Flex align="center" gap={2}>
              <Text size={1} style={{color: 'var(--card-muted-fg-color)', fontSize: '11px'}}>
                {isCollapsed ? '▶' : '▼'}
              </Text>
              <Label size={4}>{groupName}</Label>
              <Badge fontSize={1} tone="primary" padding={2}>
                {rows.length}
              </Badge>
              {isCollapsed && selectedInGroupCount > 0 && (
                <Text size={2} muted>
                  · {selectedInGroupCount} selected
                </Text>
              )}
            </Flex>
          </Flex>
        </div>
      </Card>
      {rows.map((row, i) => (
        <div
          role="row"
          key={row.id}
          style={{
            display: isCollapsed ? 'none' : 'grid',
            gridTemplateColumns,
            borderBottom: '1px solid var(--card-border-color)',
            backgroundColor:
              i % 2 === 0 ? 'var(--card-code-bg-color, var(--card-bg2-color))' : undefined,
          }}
        >
          {row.getAllCells().map((cell) => {
            const isEditable = cell.column.columnDef.meta?.editable as boolean
            const isTextEdit = cell.column.columnDef.meta?.editMode === 'text'
            return (
              <motion.div
                layout={isDragging && !isResizing ? 'position' : undefined}
                layoutId={reorderable ? `gcell-${cell.id}` : undefined}
                transition={
                  isDragging && !isResizing
                    ? {type: 'spring', stiffness: 500, damping: 35}
                    : {duration: 0}
                }
                role="cell"
                key={cell.id}
                className={isTextEdit ? 'editable-text' : undefined}
                style={{
                  padding: isTextEdit ? 0 : '10px 16px',
                  cursor: isEditable ? 'pointer' : undefined,
                  borderRight: '1px solid var(--card-border-color)',
                  overflow: 'hidden',
                  display: isTextEdit ? undefined : 'flex',
                  alignItems: isTextEdit ? undefined : 'center',
                  gridColumn: reorderable ? columnPositionMap[cell.column.id] : undefined,
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </motion.div>
            )
          })}
        </div>
      ))}
    </>
  )
}
