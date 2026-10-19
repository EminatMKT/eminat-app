import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PairDetail from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

// What PairDetail hands the shared Modal, which owns role, focus trap, Escape and focus return
// (tested in `Modal/useDialog`). The mock keeps the props and swallows the markup.
type Seen = {
  title?: string
  onClose: () => void
  footer?: ReactNode
  children?: ReactNode
}
const seen = vi.hoisted(() => {
  const calls: Seen[] = []
  return calls
})
vi.mock('@/shared/components/ui/Modal', () => ({ default: (props: Seen) => { seen.push(props); return null } }))

const onCancelar = vi.fn()
const NO_CHOICES: Record<string, string> = {}
const NO_PREVIEW: ReactNode = null
const PREVIEW = 'the-preview'
const DEFAULT_OPEN_OPTIONS = {
  ocupado: false,
  errorDescarte: false,
  errorFusion: false,
  choices: NO_CHOICES,
  preview: NO_PREVIEW,
}

const open = ({
  ocupado = false,
  errorDescarte = false,
  errorFusion = false,
  choices = NO_CHOICES,
  preview = NO_PREVIEW,
}: Partial<typeof DEFAULT_OPEN_OPTIONS> = DEFAULT_OPEN_OPTIONS) => {
  seen.length = 0
  const controls = {
    choices,
    onChoose: vi.fn(),
    excludedIds: [],
    onToggleExcluded: vi.fn(),
  }
  renderToStaticMarkup(
    <PairDetail itemA={{ name: 'Ana Winner' }} itemB={{ name: 'Bea Loser' }} ocupado={ocupado}
      errorDescarte={errorDescarte} errorFusion={errorFusion}
      renderResumen={item => item.name} renderComparacion={() => 'the-grid'} controls={controls}
      preview={preview} onCancelar={onCancelar} onNotSame={vi.fn()} onKeepSeparate={vi.fn()} onFusionar={vi.fn()} />,
  )
  return seen[0]
}
const markup = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)

describe('PairDetail', () => {
  beforeEach(() => onCancelar.mockReset())

  it('opens as a titled dialog that closes on ✕, Escape or backdrop when nothing is at stake', () => {
    const dialog = open()
    expect(dialog.title).toBe('dedup.pairTitle')
    dialog.onClose()
    expect(onCancelar).toHaveBeenCalledOnce()
  })

  it('does not close while a decision is in flight', () => {
    open({ ocupado: true }).onClose()
    expect(onCancelar).not.toHaveBeenCalled()
  })

  it('does not drop picks on a stray close: it asks first', () => {
    open({ choices: { seguro: 'Cigna' } }).onClose()
    expect(onCancelar).not.toHaveBeenCalled()
  })

  // The walkthrough bug: the decisions sat below the whole list. The fixed footer never scrolls.
  it('keeps all four decisions in the fixed footer, all disabled mid-decision', () => {
    expect(markup(open().footer).split('<button').length - 1).toBe(4)
    expect(markup(open({ ocupado: true }).footer).split('disabled=""').length - 1).toBe(4)
  })

  it('says which record stays and which is merged in, in that order', () => {
    const body = markup(open().children)
    const order = ['dedup.winnerLabel', 'Ana Winner', 'dedup.loserLabel', 'Bea Loser', 'the-grid']
    const positions = order.map(needle => body.indexOf(needle))
    expect(positions.every(p => p >= 0)).toBe(true)
    expect([...positions].sort((left, right) => left - right)).toEqual(positions)
  })

  it('shows what the merge will save right below the grid', () => {
    const body = markup(open({ preview: PREVIEW }).children)
    expect(body.indexOf(PREVIEW)).toBeGreaterThan(body.indexOf('the-grid'))
  })

  it('draws nothing past the grid when no preview is given', () => {
    expect(markup(open().children).endsWith('the-grid')).toBe(true)
  })

  it('shows each failure with its own copy', () => {
    expect(markup(open().children)).not.toContain('dedup.mergeFailed')
    expect(markup(open({ errorFusion: true }).children)).toContain('dedup.mergeFailed')
    const discard = markup(open({ errorDescarte: true }).children)
    expect(discard).toContain('dedup.discardFailed')
    expect(discard).not.toContain('dedup.mergeFailed')
  })
})
