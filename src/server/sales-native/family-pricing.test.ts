import {describe,it,expect} from 'vitest'
import {quoteExpandedFamily,quoteFamilyProration} from './family-pricing'
import {quoteMembership,quoteRenewal} from './pricing'
describe('official Family additional-member pricing',()=>{
  for(const [plan,rate] of [['ESSENTIAL',4999],['PLUS',6999],['MAX',8999]] as const)
    for(const duration of ['MONTHLY','3M','6M','12M'] as const)for(const count of [0,1,2,3,5,9])
      it(`${plan} ${duration} +${count}`,()=>{
        const base=quoteMembership(plan,'FAMILY',duration),renewal=quoteRenewal(plan,'FAMILY',duration)
        expect(quoteExpandedFamily(plan,duration,count).totalCents).toBe(base.totalCents+rate*base.initialMonths*count)
        expect(quoteExpandedFamily(plan,duration,count,true).totalCents).toBe(renewal.totalCents+rate*renewal.initialMonths*count)
      })
  it('charges the actual remaining calendar-month fraction with per-person cent rounding',()=>{
    const q=quoteFamilyProration('ESSENTIAL',2,'2026-02-15','2026-04-01',[{startsAt:'2026-01-01',expiresAt:'2026-04-01'}])
    expect(q.monthNumerator).toBe('3');expect(q.monthDenominator).toBe('2')
    expect(q.perMemberCents).toBe(7499);expect(q.totalCents).toBe(14998)
    expect(q.cycles).toHaveLength(2)
  })
  it('uses leap-year days, not a fixed 30-day divisor',()=>{
    const q=quoteFamilyProration('PLUS',1,'2028-02-15','2028-03-01',[{startsAt:'2028-02-01',expiresAt:'2028-03-01'}])
    expect(q.monthNumerator).toBe('15');expect(q.monthDenominator).toBe('29');expect(q.perMemberCents).toBe(3620)
  })
  it('preserves calendar end-of-month cycles and future paid renewal periods',()=>{
    expect(quoteFamilyProration('MAX',3,'2026-01-31','2026-05-30',[
      {startsAt:'2026-01-31',expiresAt:'2026-04-30'},{startsAt:'2026-04-30',expiresAt:'2026-05-30'},
    ]).totalCents).toBe(8999*4*3)
  })
  it('does not charge unpaid gaps, overlapping periods, invalid dates or expired coverage',()=>{
    for(const periods of [[],[{startsAt:'2026-02-10',expiresAt:'2026-03-01'}],
      [{startsAt:'2026-01-01',expiresAt:'2026-03-01'},{startsAt:'2026-02-01',expiresAt:'2026-03-01'}]])
      expect(()=>quoteFamilyProration('ESSENTIAL',1,'2026-02-01','2026-03-01',periods)).toThrow()
    expect(()=>quoteFamilyProration('ESSENTIAL',1,'2026-02-30','2026-03-01',[])).toThrow()
    expect(()=>quoteFamilyProration('ESSENTIAL',1,'2026-03-01','2026-03-01',[])).toThrow()
  })
  for(const count of [-1,10,0.5,NaN])it(`rejects invalid count ${count}`,()=>{
    expect(()=>quoteExpandedFamily('ESSENTIAL','MONTHLY',count)).toThrow()
  })
})
