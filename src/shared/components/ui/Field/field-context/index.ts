'use client'
import { createContext } from 'react'
import type { ControlProps } from '../types'

const FieldContext = createContext<ControlProps>({})

export default FieldContext

// The channel between a Field and the control a component draws inside it. Empty by default, so
// a control rendered outside any Field is left exactly as it was.
