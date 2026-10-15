import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import capturarHook from '.'

describe('capturarHook', () => {
  it('returns a hook\'s result from a single render pass', () => {
    const resultado = capturarHook(() => useState(3))
    expect(resultado[0]).toBe(3)
  })
})
