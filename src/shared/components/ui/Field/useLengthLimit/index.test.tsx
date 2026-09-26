import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useLengthLimit from './index'
import type { FieldLimit } from '../types'

const BASE = 'concept'
const MAX = 120
const FAR = { length: 10, max: MAX }
const NEAR = { length: 118, max: MAX }

type ProbeProps = { own?: FieldLimit }

/** Prints what the hook describes the control with, and which handlers it hands it. */
function Probe({ own }: ProbeProps) {
  const guard = useLengthLimit(BASE, own)
  const handlers = Object.keys(guard.handlers)
  return <output data-described={guard.describedBy.join(' ')} data-handlers={handlers.join(' ')} />
}

const described = (own?: FieldLimit) => renderToStaticMarkup(<Probe own={own} />)

describe('useLengthLimit', () => {
  it('describes nothing and guards nothing for a box without a limit', () => {
    const html = described()
    expect(html).toContain('data-described=""')
    expect(html).toContain('data-handlers=""')
  })

  // The notice region is always there to be announced into; the count only once it is drawn.
  it('describes the box with its notice, and with its count only near the limit', () => {
    expect(described(FAR)).toContain(`data-described="${BASE}-cut"`)
    expect(described(NEAR)).toContain(`data-described="${BASE}-cut ${BASE}-count"`)
  })

  it('guards a limited box against pastes, drops and typing, and settles on input', () => {
    const html = described(FAR)
    expect(html).toContain('onPaste onDrop onBeforeInput onInput')
  })
})
