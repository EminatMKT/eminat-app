import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import useFocusValidation from './index'

const UNFOCUSED_TOKEN = 0
const FOCUSED_TOKEN = 1

type ProbeProps = { token: number }

let seen: ReturnType<typeof useFocusValidation> | null = null

function Probe(props: ProbeProps) {
  seen = useFocusValidation(props.token)

  return null
}

describe('useFocusValidation', () => {
  it('returns a ref the caller attaches to the validation banner', () => {
    const unfocusedProps = { token: UNFOCUSED_TOKEN }

    renderToStaticMarkup(createElement(Probe, unfocusedProps))

    expect(seen?.current).toBeNull()
  })

  it('accepts an advanced token without throwing, for the caller to re-render on', () => {
    const focusedProps = { token: FOCUSED_TOKEN }
    const draw = () => renderToStaticMarkup(createElement(Probe, focusedProps))

    expect(draw).not.toThrow()
  })
})
