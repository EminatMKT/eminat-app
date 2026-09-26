'use client'
import { createContext } from 'react'
import type { FieldChannel } from '../types'

const FieldContext = createContext<FieldChannel>({ control: {} })

export default FieldContext

// The channel between a Field and the control a component draws inside it. Empty by default, so
// a control rendered outside any Field is left exactly as it was — and has nowhere to report.
