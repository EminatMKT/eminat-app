import {
  describe,
  it,
  expect,
  vi,
} from 'vitest'

const state = vi.hoisted(() => ({
  tokens: {
    bg: '#FFFFFF',
    s1: '#F5F5F5',
    s2: '#EEEEEE',
    s3: '#E0E0E0',
    border: '#CCCCCC',
    t1: '#111111',
    t2: '#333333',
    t3: '#666666',
    accent: '#7C6FF7',
    inputStyle: { background: '#FFFFFF' },
  },
}))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => state.tokens }))

import useDashboardTheme from '.'

describe('useDashboardTheme', () => {
  it('returns the live AppContext tokens plus the static warn color', () => {
    expect(useDashboardTheme()).toEqual({ ...state.tokens, warn: '#FBBF24' })
  })

  it('reads AppContext live, not a cached snapshot', () => {
    state.tokens = { ...state.tokens, bg: '#0B0B10', t1: '#FFFFFF' }
    expect(useDashboardTheme()).toEqual({ ...state.tokens, warn: '#FBBF24' })
  })
})
