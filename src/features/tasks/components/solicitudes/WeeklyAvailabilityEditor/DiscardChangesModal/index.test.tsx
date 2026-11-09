import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import * as uiModule from '@/shared/components/ui'
import * as i18nModule from '@/shared/i18n'
import { DISCARD_MODAL_COPY } from './constants'
import type { Props } from './types'
import DiscardChangesModal from './index'

const BUTTON_EXPORT = 'Button'
const USE_T_EXPORT = 'useT'
const IDENTITY_LOCALE_STATE: ReturnType<typeof i18nModule.useT> = {
  locale: 'es',
  intlLocale: 'es-AR',
  setLocale: vi.fn(),
  t: (key: string) => key,
}

const seenButtons: ComponentProps<typeof uiModule.Button>[] = []

function captureButton(props: ComponentProps<typeof uiModule.Button>) {
  seenButtons.push(props)

  return null
}

function renderDialog(props: Props) {
  seenButtons.length = 0
  vi.spyOn(i18nModule, USE_T_EXPORT).mockReturnValue(IDENTITY_LOCALE_STATE)
  vi.spyOn(uiModule, BUTTON_EXPORT).mockImplementation(captureButton)
  renderToStaticMarkup(<DiscardChangesModal {...props} />)

  return seenButtons
}

describe('DiscardChangesModal', () => {
  it('renders the discard, save-and-exit, and keep-editing labels', () => {
    const props: Props = { onDiscard: vi.fn(), onSaveAndExit: vi.fn(), onKeepEditing: vi.fn() }

    const [discardButton, saveAndExitButton, keepEditingButton] = renderDialog(props)

    expect(discardButton.label).toBe(DISCARD_MODAL_COPY.discard)
    expect(saveAndExitButton.label).toBe(DISCARD_MODAL_COPY.saveAndExit)
    expect(keepEditingButton.label).toBe(DISCARD_MODAL_COPY.keepEditing)
  })

  it('wires each button to its own prop callback', () => {
    const onDiscard = vi.fn()
    const onSaveAndExit = vi.fn()
    const onKeepEditing = vi.fn()
    const props: Props = { onDiscard, onSaveAndExit, onKeepEditing }

    const [discardButton, saveAndExitButton, keepEditingButton] = renderDialog(props)

    discardButton.onClick()
    saveAndExitButton.onClick()
    keepEditingButton.onClick()

    expect(onDiscard).toHaveBeenCalledOnce()
    expect(onSaveAndExit).toHaveBeenCalledOnce()
    expect(onKeepEditing).toHaveBeenCalledOnce()
  })
})

// Confirms DiscardChangesModal labels its three actions and wires each to its own prop callback.
