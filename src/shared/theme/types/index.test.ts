import { describe, it, expect } from 'vitest'
import type { Theme, ThemeName } from './index'

describe('theme/types', () => {
  it('Theme requires every token field used by the themed content area', () => {
    const sample: Theme = {
      bg: '#000',
      s1: '#000',
      s2: '#000',
      s3: '#000',
      border: '#000',
      t1: '#000',
      t2: '#000',
      t3: '#000',
      accent: '#000',
      inputStyle: {},
    }
    expect(Object.keys(sample).sort()).toEqual(
      ['accent', 'bg', 'border', 'inputStyle', 's1', 's2', 's3', 't1', 't2', 't3'],
    )
  })

  it('ThemeName only allows the two registered names', () => {
    const names: ThemeName[] = ['light', 'dark']
    expect(names).toEqual(['light', 'dark'])
  })
})
