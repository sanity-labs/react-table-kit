import {fireEvent, screen} from '@testing-library/react'
import React from 'react'
import {describe, expect, it, vi} from 'vitest'

import {TableCellChrome} from '../src/components/cells/TableCellChrome'
import {renderWithTheme} from './helpers'

describe('TableCellChrome', () => {
  it('renders leading/title/subtitle/trailing slots', () => {
    renderWithTheme(
      <TableCellChrome
        dataTestId="chrome-slots"
        leading={<span>LEADING</span>}
        state="filled"
        subtitle={<span>Subtitle</span>}
        title={<span>Title</span>}
        trailing={<span>TRAILING</span>}
      />,
    )

    expect(screen.getByTestId('chrome-slots')).toHaveAttribute('data-state', 'filled')
    expect(screen.getByText('LEADING')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
    expect(screen.getByText('TRAILING')).toBeInTheDocument()
  })

  it('defaults to filledOnly border mode', () => {
    renderWithTheme(
      <>
        <TableCellChrome dataTestId="default-filled" state="filled" title={<span>Filled</span>} />
        <TableCellChrome dataTestId="default-empty" state="empty" title={<span>Empty</span>} />
      </>,
    )

    expect(screen.getByTestId('default-filled')).toHaveAttribute('data-border', 'true')
    expect(screen.getByTestId('default-empty')).toHaveAttribute('data-border', 'false')
  })

  it('supports all border modes', () => {
    renderWithTheme(
      <>
        <TableCellChrome
          borderMode="always"
          dataTestId="border-always"
          state="empty"
          title={<span>Always</span>}
        />
        <TableCellChrome
          borderMode="never"
          dataTestId="border-never"
          state="filled"
          title={<span>Never</span>}
        />
        <TableCellChrome
          borderMode="emptyOnly"
          dataTestId="border-empty-only"
          state="empty"
          title={<span>Empty only</span>}
        />
      </>,
    )

    expect(screen.getByTestId('border-always')).toHaveAttribute('data-border', 'true')
    expect(screen.getByTestId('border-never')).toHaveAttribute('data-border', 'false')
    expect(screen.getByTestId('border-empty-only')).toHaveAttribute('data-border', 'true')
  })

  it('invokes onPress for interactive chrome', () => {
    const onPress = vi.fn()

    renderWithTheme(
      <TableCellChrome
        dataTestId="interactive-chrome"
        onPress={onPress}
        state="filled"
        title="Press me"
      />,
    )

    fireEvent.click(screen.getByRole('button', {name: 'Press me'}))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
