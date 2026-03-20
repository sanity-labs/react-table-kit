import {Badge} from '@sanity/ui'

import {BadgeTone} from './columns'

function capitalize(str: string): string {
  return str.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Rich color map entry — either a tone string or an object with tone and label.
 */
export type BadgeColorMapEntry = string | {tone: string; label: string}

/**
 * Maps field values to badge tones and optional display labels.
 */
export type BadgeColorMap = Record<string, BadgeColorMapEntry>

export interface BadgeCellProps {
  /** The raw field value to display. */
  value: unknown
  /** Maps values to badge tones and optional labels. */
  colorMap?: BadgeColorMap
}

/**
 * Renders a value as a colored Sanity UI Badge.
 *
 * Resolves the value against a colorMap to determine tone and display label.
 * Auto-capitalizes snake_case/kebab-case values when no explicit label is provided.
 *
 * @example
 * ```tsx
 * <BadgeCell value="pending_review" colorMap={{pending_review: {tone: 'caution', label: 'Pending Review'}}} />
 * <BadgeCell value="draft" colorMap={{draft: 'caution'}} />
 * ```
 */
export function BadgeCell({value, colorMap}: BadgeCellProps) {
  const str = String(value ?? '')
  const entry = colorMap?.[str]
  const tone = entry ? (typeof entry === 'object' ? entry.tone : entry) : undefined
  const label = entry && typeof entry === 'object' ? entry.label : capitalize(str)
  return (
    <Badge fontSize={1} padding={2} tone={tone as BadgeTone}>
      {label}
    </Badge>
  )
}
