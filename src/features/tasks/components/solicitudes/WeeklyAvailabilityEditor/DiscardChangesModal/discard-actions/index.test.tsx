import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { Props } from '../types'
import Actions from './index'

const CANCEL_KIND = 'cancel'
const CONFIRM_KIND = 'confirm'

describe('Actions', () => {
  it('builds discard, save-and-exit, and keep-editing buttons from the dialog props', () => {
    const translate = vi.fn((key: string) => key)
    const props: Props = { onDiscard: vi.fn(), onSaveAndExit: vi.fn(), onKeepEditing: vi.fn() }

    const element = Actions(props, translate)
    const [discardButton, saveAndExitButton, keepEditingButton] = element.props.children

    expect(discardButton.props.kind).toBe(CANCEL_KIND)
    expect(discardButton.props.onClick).toBe(props.onDiscard)
    expect(saveAndExitButton.props.kind).toBe(CONFIRM_KIND)
    expect(saveAndExitButton.props.onClick).toBe(props.onSaveAndExit)
    expect(keepEditingButton.props.kind).toBe(CANCEL_KIND)
    expect(keepEditingButton.props.onClick).toBe(props.onKeepEditing)
  })
})

// Confirms Actions wires each prop callback to its own button, kept apart from label translation.
