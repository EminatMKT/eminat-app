import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EDITOR_COPY } from '../constants'
import { VALIDATION_SUMMARY_KEY } from '../editor-feedback/constants'
import { VALIDATION_ID, VALIDATION_LIVE, VALIDATION_TAB_INDEX } from './constants'
import ValidationBanner from './index'

const MESSAGE = VALIDATION_SUMMARY_KEY

describe('ValidationBanner', () => {
  it('announces the message assertively, focus-targetable by the editor above it', () => {
    const focusRef = createRef<HTMLDivElement>()
    const html = renderToStaticMarkup(
      <ValidationBanner message={MESSAGE} focusRef={focusRef} />,
    )

    expect(html).toContain(MESSAGE)
    expect(html).toMatch(`id="${VALIDATION_ID}"`)
    expect(html).toContain(`role="${EDITOR_COPY.alertRole}"`)
    expect(html).toMatch(`aria-live="${VALIDATION_LIVE}"`)
    expect(html).toContain(`tabindex="${VALIDATION_TAB_INDEX}"`)
  })
})

// The focus ref is the editor's own: this component only renders, never owns, where focus lands.
