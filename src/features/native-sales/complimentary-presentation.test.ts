import { describe, expect, it } from 'vitest'
import { benefitActions, benefitDate, validIssueWindow } from './complimentary-presentation'
const now=Date.parse('2026-11-23T15:00:00Z'),future='2027-02-23T05:00:00Z'
describe('complimentary review guardrails',()=>{
 it('offers only lifecycle actions supported for the current coverage state',()=>{
  expect(benefitActions('PENDING',null,now)).toEqual(['REVOKE'])
  expect(benefitActions('ACTIVE',future,now)).toEqual(['EXTEND','SUSPEND','REVOKE'])
  expect(benefitActions('SUSPENDED',future,now)).toEqual(['REACTIVATE','EXTEND','REVOKE'])
  expect(benefitActions('ACTIVE','2026-11-22T00:00:00Z',now)).toEqual(['REVOKE'])
  expect(benefitActions('REVOKED',future,now)).toEqual([])
 })
 it('rejects malformed, reversed, expired or unassigned direct activation before submission',()=>{
  for(const input of [['REDEMPTION_CODE','bad',future,null],['REDEMPTION_CODE',future,'2026-12-01T00:00:00Z',null],['REDEMPTION_CODE','2025-01-01','2025-02-01',null],['ADMIN_DIRECT','2026-11-22',future,null],['ADMIN_DIRECT','2026-12-01',future,'contact']] as const)
   expect(validIssueWindow(input[0],input[1],input[2],input[3],now)).toBe(false)
  expect(validIssueWindow('ADMIN_DIRECT','2026-11-23T14:59:00Z',future,'contact',now)).toBe(true)
  expect(validIssueWindow('REDEMPTION_CODE','2026-12-01',future,null,now)).toBe(true)
 })
 it('shows the inclusive last coverage day in the captured timezone, including DST boundaries',()=>{
  expect(benefitDate('2027-02-23T05:00:00Z','en-US','America/New_York',true)).toBe('Feb 22, 2027')
  expect(benefitDate('2027-03-15T04:00:00Z','en-US','America/New_York',true)).toBe('Mar 14, 2027')
  expect(benefitDate(null,'en-US','America/New_York')).toBeNull()
  expect(benefitDate('invalid','en-US','America/New_York')).toBeNull()
 })
})
