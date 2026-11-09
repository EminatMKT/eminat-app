import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import * as i18nModule from '@/shared/i18n'
import type { Props } from '../types'
import useDialogView from './index'

const USE_T_EXPORT = 'useT'

const LOCALE_STATE: ReturnType<typeof i18nModule.useT> = {
  locale: 'es',
  intlLocale: 'es-AR',
  setLocale: vi.fn(),
  t: vi.fn(),
}

let seen: ReturnType<typeof useDialogView> | null = null

function Probe(props: Props) {
  seen = useDialogView(props)

  return null
}

describe('useDialogView', () => {
  it('returns onKeepEditing as close, and the translator from useT', () => {
    vi.spyOn(i18nModule, USE_T_EXPORT).mockReturnValue(LOCALE_STATE)
    const onKeepEditing = vi.fn()
    const props: Props = { onDiscard: vi.fn(), onSaveAndExit: vi.fn(), onKeepEditing }

    renderToStaticMarkup(createElement(Probe, props))

    expect(seen?.close).toBe(onKeepEditing)
    expect(seen?.t).toBe(LOCALE_STATE.t)
  })
})

// Confirms useDialogView forwards onKeepEditing unchanged and passes through useT's translator.
