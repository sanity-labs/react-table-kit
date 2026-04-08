import {Box, Button, Card, Flex} from '@sanity/ui'
import type {ReactNode} from 'react'

export type TableCellChromeBorderMode = 'always' | 'emptyOnly' | 'filledOnly' | 'never'
export type TableCellChromeState = 'empty' | 'filled'

export interface TableCellChromeProps {
  borderMode?: TableCellChromeBorderMode
  dataTestId?: string
  disabled?: boolean
  leading?: ReactNode
  minHeight?: number
  onPress?: () => void
  state: TableCellChromeState
  subtitle?: ReactNode
  title: ReactNode
  trailing?: ReactNode
}

function shouldShowBorder(
  borderMode: TableCellChromeBorderMode,
  state: TableCellChromeState,
): boolean {
  if (borderMode === 'always') return true
  if (borderMode === 'never') return false
  if (borderMode === 'emptyOnly') return state === 'empty'
  return state === 'filled'
}

export function TableCellChrome({
  borderMode = 'filledOnly',
  dataTestId,
  disabled = false,
  leading,
  minHeight = 26,
  onPress,
  state,
  subtitle,
  title,
  trailing,
}: TableCellChromeProps) {
  const border = shouldShowBorder(borderMode, state)
  const isInteractive = typeof onPress === 'function'

  const content = (
    <Flex align="center" gap={2} style={{minHeight, width: '100%'}}>
      {leading ? <Box style={{display: 'flex', flexShrink: 0}}>{leading}</Box> : null}

      <Flex
        direction="column"
        gap={subtitle ? 2 : 0}
        justify="center"
        style={{flex: 1, minWidth: 0, width: '100%'}}
      >
        <Box style={{minWidth: 0}}>{title}</Box>
        {subtitle ? <Box style={{minWidth: 0}}>{subtitle}</Box> : null}
      </Flex>

      {trailing ? <Box style={{display: 'flex', flexShrink: 0}}>{trailing}</Box> : null}
    </Flex>
  )

  return (
    <Card
      border={border}
      data-border={border ? 'true' : 'false'}
      data-state={state}
      data-testid={dataTestId}
      padding={1}
      radius={2}
      style={{width: '100%'}}
      tone={border ? 'transparent' : undefined}
    >
      {isInteractive ? (
        <Button
          disabled={disabled}
          mode="bleed"
          muted
          onClick={onPress}
          padding={2}
          radius={0}
          style={{width: '100%'}}
          tone="neutral"
        >
          {content}
        </Button>
      ) : (
        <Box padding={2}>{content}</Box>
      )}
    </Card>
  )
}
