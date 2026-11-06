import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CreatePreview from '.'

const PX_PER_MIN = 2
const EXPECTED_TOP_VAR = '--preview-top:1080px'
const EXPECTED_HEIGHT_VAR = '--preview-height:120px'
const MARKER_ATTRIBUTE = 'data-create-preview'
const INTERACTIVE_ROLE_MARKUP = 'role="button"'

describe('CreatePreview', () => {
  it('positions itself from the bounds start and sizes itself from their span', () => {
    const html = renderToStaticMarkup(
      <CreatePreview bounds={{ start: 540, end: 600 }} pxPerMin={PX_PER_MIN} />,
    )

    expect(html).toContain(EXPECTED_TOP_VAR)
    expect(html).toContain(EXPECTED_HEIGHT_VAR)
  })

  it('carries the create-preview marker attribute, never an interactive role', () => {
    const html = renderToStaticMarkup(
      <CreatePreview bounds={{ start: 0, end: 30 }} pxPerMin={PX_PER_MIN} />,
    )

    expect(html).toContain(MARKER_ATTRIBUTE)
    expect(html).not.toContain(INTERACTIVE_ROLE_MARKUP)
  })
})
