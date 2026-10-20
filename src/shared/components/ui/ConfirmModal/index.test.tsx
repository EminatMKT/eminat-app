import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ConfirmModal from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

// What ConfirmModal hands the shared Modal: the role it asks for, what its close does, and the
// footer — rendered separately below, since this mock swallows real Modal markup entirely.
type Seen = { role?: string; onClose: () => void; footer?: ReactNode }
const seen: Seen[] = []
vi.mock('@/shared/components/ui/Modal', () => ({
  default: (props: Seen) => { seen.push(props); return null },
}))

// Fixtures, not shipped copy.
const QUESTION = 'Remove this payment?'
const WARNING = 'Gone for good'
const ACTION = 'Delete'
const NOTE_LABEL = 'Explain why'

const ask = (onConfirm: (texto?: string) => void, onClose: () => void) => {
  seen.length = 0
  renderToStaticMarkup(
    <ConfirmModal destructive title={QUESTION} message={WARNING} confirmLabel={ACTION}
      onConfirm={onConfirm} onClose={onClose} />,
  )
  return seen[0]
}

const askForNote = (onConfirm: (texto?: string) => void, onClose: () => void) => {
  seen.length = 0
  renderToStaticMarkup(
    <ConfirmModal
      title={QUESTION}
      message={WARNING}
      confirmLabel={ACTION}
      notaLabel={NOTE_LABEL}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  )
  return seen[0]
}

describe('ConfirmModal', () => {
  it('interrupts as an alertdialog', () => {
    expect(ask(vi.fn(), vi.fn()).role).toBe('alertdialog')
  })

  // Escape closes the dialog through its `onClose`: in a destructive question that has to be the
  // cancel, so the reflex gets the safe answer.
  it('answers Escape with the cancel, never with the confirmation', () => {
    const [onConfirm, onClose] = [vi.fn(), vi.fn()]
    ask(onConfirm, onClose).onClose()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  // Note mode starts with nothing typed, so this is the one state SSR can observe directly: the
  // confirm button has to come up disabled, the same way `confirmPhrase` mode already does.
  it('starts the confirm button disabled in note mode', () => {
    const vista = askForNote(vi.fn(), vi.fn())
    const html = renderToStaticMarkup(<>{vista.footer}</>)
    expect(html).toContain('disabled')
  })
})
