import {Badge, Text} from '@sanity/ui'

/** Capitalize first letter of a string */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Format a date string as relative time (e.g., "3 hours ago", "2 days ago") */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  return 'just now'
}

/**
 * Default cell renderers for built-in column types.
 * Maps column ID to a render function using Sanity UI components.
 */
export const DEFAULT_CELL_RENDERERS: Record<string, (value: unknown) => React.ReactNode> = {
  title: (value) => (
    <Text size={1} weight="medium">
      {String(value ?? '')}
    </Text>
  ),
  type: (value) => (
    <Badge fontSize={1} padding={2} tone="primary">
      {capitalize(String(value ?? ''))}
    </Badge>
  ),
  updatedAt: (value) => (
    <Text muted size={1}>
      {value ? formatRelativeTime(String(value)) : ''}
    </Text>
  ),
}
