import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import nativeChild from './index'

const TEXT = 'plain text'

function Drawn() {
  return null
}

describe('nativeChild', () => {
  it('takes a native tag placed straight inside', () => {
    expect(nativeChild(createElement('input'))).not.toBeNull()
  })

  it('leaves a component and plain text to the context', () => {
    expect(nativeChild(createElement(Drawn))).toBeNull()
    expect(nativeChild(TEXT)).toBeNull()
  })
})
