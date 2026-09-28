import { describe, it, expect } from 'vitest'
import billingRecordInput from '../index'
import isRecordInput from './index'

const NOTE = { recordType: 'month_note', noteMonth: '2026-09-01', noteText: 'Books close on the 28th' }

describe('isRecordInput', () => {
  // The schema's own output has to pass: that is how a parsed value is named back as the DTO.
  it('accepts what the schema itself produced', () => {
    const parsed: unknown = billingRecordInput.parse(NOTE)
    expect(isRecordInput(parsed)).toBe(true)
  })

  it('refuses a value the schema would refuse', () => {
    expect(isRecordInput({ ...NOTE, noteMonth: 'soon' })).toBe(false)
    expect(isRecordInput(null)).toBe(false)
  })
})
