import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import useValidationBanner from './index'

const FOCUS_TOKEN = 0
const translate = vi.fn((key: string) => key)
const NO_ERRORS: RangeValidationError[] = []
const ONE_ERROR: RangeValidationError[] = [{ code: 'end-not-after-start', rangeIndex: 0 }]

let seen: ReturnType<typeof useValidationBanner> = null

type ProbeProps = { errors: RangeValidationError[] }

function Probe(props: ProbeProps) {
  const source = { validationFocusToken: FOCUS_TOKEN, errors: props.errors }

  seen = useValidationBanner(source, translate)

  return null
}

describe('useValidationBanner', () => {
  it('returns null when there are no validation errors', () => {
    const probeProps = { errors: NO_ERRORS }

    renderToStaticMarkup(createElement(Probe, probeProps))

    expect(seen).toBeNull()
  })

  it('returns the message and a focus ref when ranges are invalid', () => {
    const probeProps = { errors: ONE_ERROR }

    renderToStaticMarkup(createElement(Probe, probeProps))

    expect(seen?.message).toBeTruthy()
    expect(seen?.focusRef.current).toBeNull()
  })
})
