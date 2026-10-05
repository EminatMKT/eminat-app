import { describe, it, expect } from 'vitest'
import validateModuleSlugs from './index'

describe('validateModuleSlugs', () => {
  it('all valid → ok', () => { expect(validateModuleSlugs(['cobranzas', 'directorio']).ok).toBe(true) })
  it('one invalid → error', () => { expect(validateModuleSlugs(['cobranzas', 'fake']).ok).toBe(false) })
})
