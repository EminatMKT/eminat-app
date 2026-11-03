import { describe, expect, it } from 'vitest'
import RANGE_FIELD_CONSTANTS from '../constants'
import resolveNativeElement from './index'

describe('resolveNativeElement', () => {
  it('renders a time input with its native step', () => {
    const element = resolveNativeElement(RANGE_FIELD_CONSTANTS.timeInputType)

    expect(element.tag).toBe(RANGE_FIELD_CONSTANTS.nativeInputTag)
    expect(element.nativeOnlyProps).toEqual({
      type: RANGE_FIELD_CONSTANTS.timeInputType,
      step: RANGE_FIELD_CONSTANTS.timeStep,
    })
  })

  it('renders a text input without a step', () => {
    const element = resolveNativeElement(RANGE_FIELD_CONSTANTS.textInputType)

    expect(element.tag).toBe(RANGE_FIELD_CONSTANTS.nativeInputTag)
    expect(element.nativeOnlyProps).toEqual({ type: RANGE_FIELD_CONSTANTS.textInputType })
  })

  it('renders a textarea without input-only attributes', () => {
    const element = resolveNativeElement(RANGE_FIELD_CONSTANTS.textareaInputType)

    expect(element.tag).toBe(RANGE_FIELD_CONSTANTS.textareaInputType)
    expect(element.nativeOnlyProps).toEqual({})
  })
})
