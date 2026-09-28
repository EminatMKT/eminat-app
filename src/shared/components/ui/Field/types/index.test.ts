import { describe, expectTypeOf, it } from 'vitest'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { ControlProps } from './index'

describe('Field types', () => {
  // What the Field hands down is spread straight onto the control, whichever of the three it is.
  it('fits any native form control', () => {
    expectTypeOf<ControlProps>().toMatchTypeOf<InputHTMLAttributes<HTMLInputElement>>()
    expectTypeOf<ControlProps>().toMatchTypeOf<SelectHTMLAttributes<HTMLSelectElement>>()
    expectTypeOf<ControlProps>().toMatchTypeOf<TextareaHTMLAttributes<HTMLTextAreaElement>>()
  })
})

// Checked by `tsc`, not at run time. The empty default is exercised in useFieldControl's suite.
