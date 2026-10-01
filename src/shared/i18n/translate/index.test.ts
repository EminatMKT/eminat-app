import { describe, expect, it } from 'vitest'
import translate from './index'

describe('translate', () => {
  it('selects the requested dictionary', () => {
    expect(translate('en', 'common.duplicate')).toBe('Duplicate')
    expect(translate('es', 'common.duplicate')).toBe('Duplicar')
  })
  it('interpolates provided values and preserves missing placeholders', () => {
    expect(translate('en', 'common.saveBlocked.missing', { fields: 'Title' })).toContain('Title')
    expect(translate('en', 'common.saveBlocked.missing', {})).toContain('{fields}')
  })
})
