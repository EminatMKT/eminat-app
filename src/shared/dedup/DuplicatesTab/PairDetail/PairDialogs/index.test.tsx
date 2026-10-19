import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ConfirmModal } from '@/shared/components/ui'
import { DISCARD_DIALOG, NOTE_DIALOG } from '../constants'
import type { OpenDialog } from '../types'
import PairDialogs from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

// Only what PairDialogs decides: which copy the shared ConfirmModal shows, and where its answer
// goes. The modal itself (focus, Escape, the note field) is covered in `ConfirmModal`'s own suite.
type Seen = Pick<ComponentProps<typeof ConfirmModal>, 'title' | 'confirmLabel' | 'notaLabel' | 'onConfirm' | 'onClose'>
const asked = vi.hoisted((): Seen[] => [])
vi.mock('@/shared/components/ui', () => ({ ConfirmModal: (props: Seen) => { asked.push(props); return null } }))

const onConfirmNote = vi.fn()
const onConfirmDiscard = vi.fn()
const onClose = vi.fn()
const TYPED_NOTE = 'same family, different people'

const show = (dialog: OpenDialog) => {
  asked.length = 0
  renderToStaticMarkup(
    <PairDialogs
      dialog={dialog}
      onConfirmNote={onConfirmNote}
      onConfirmDiscard={onConfirmDiscard}
      onClose={onClose}
    />,
  )
  return asked[0]
}

describe('PairDialogs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draws nothing while no secondary dialog is open', () => {
    expect(show(null)).toBeUndefined()
  })

  // The note is what "keep separate" records, so it has to reach the caller untouched.
  it('asks for a note before keeping the pair separate, and hands that note over', () => {
    const note = show(NOTE_DIALOG)
    expect(note.title).toBe('dedup.sameSeparated')
    expect(note.notaLabel).toBe('dedup.separatedNotePrompt')
    void note.onConfirm(TYPED_NOTE)
    expect(onConfirmNote).toHaveBeenCalledWith(TYPED_NOTE)
    expect(onConfirmDiscard).not.toHaveBeenCalled()
  })

  it('asks before throwing the picks away, with no note field', () => {
    const discard = show(DISCARD_DIALOG)
    expect(discard.title).toBe('dedup.discardChoicesTitle')
    expect(discard.confirmLabel).toBe('dedup.discardChoicesConfirm')
    expect(discard.notaLabel).toBeUndefined()
    void discard.onConfirm()
    expect(onConfirmDiscard).toHaveBeenCalledOnce()
    expect(onConfirmNote).not.toHaveBeenCalled()
  })

  it('backs out of the question without deciding anything', () => {
    show(DISCARD_DIALOG).onClose()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onConfirmDiscard).not.toHaveBeenCalled()
  })
})
