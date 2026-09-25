import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ConfirmModal from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

// What ConfirmModal hands the shared Modal: the role it asks for and what its close does.
type Seen = { role?: string; onClose: () => void }
const seen: Seen[] = []
vi.mock('@/shared/components/ui/Modal', () => ({
  default: (props: Seen) => { seen.push(props); return null },
}))

// Fixtures, not shipped copy.
const QUESTION = 'Remove this payment?'
const WARNING = 'Gone for good'
const ACTION = 'Delete'

const ask = (onConfirm: () => void, onClose: () => void) => {
  seen.length = 0
  renderToStaticMarkup(
    <ConfirmModal destructive title={QUESTION} message={WARNING} confirmLabel={ACTION}
      onConfirm={onConfirm} onClose={onClose} />,
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
})
