import {addMembershipMonths,quoteMembership,quoteRenewal,rates,type Plan,type SaleDuration} from './pricing'

export const MAX_ADDITIONAL_FAMILY_MEMBERS=9
export const FAMILY_PRORATION_VERSION='CALENDAR_MONTH_DAYS_V1'
export function assertAdditionalCount(count:number) {
  if (!Number.isSafeInteger(count) || count<0 || count>MAX_ADDITIONAL_FAMILY_MEMBERS)
    throw new Error('INVALID_ADDITIONAL_MEMBER_COUNT')
}
/** Exhibit A-3 rates. The $10 month-to-month surcharge belongs to the base plan only. */
export function additionalFamilyMonthlyCents(plan:Plan) {
  const rate=rates[plan]?.individualMonthly
  if (!Number.isSafeInteger(rate) || rate<=0) throw new Error('INVALID_FAMILY_PLAN')
  return rate
}
export function quoteExpandedFamily(plan:Plan,duration:SaleDuration,count:number,renewal=false) {
  assertAdditionalCount(count)
  const base=(renewal?quoteRenewal:quoteMembership)(plan,'FAMILY',duration)
  const rate=additionalFamilyMonthlyCents(plan)
  const additionalUnitCents=rate*base.initialMonths
  return {...base,baseCents:base.totalCents,additionalMemberCount:count,additionalMonthlyCents:rate,
    additionalUnitCents,additionalCents:additionalUnitCents*count,totalCents:base.totalCents+additionalUnitCents*count}
}
export type PaidFamilyPeriod={startsAt:string;expiresAt:string}
function day(value:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_FAMILY_PERIOD')
  const valueMs=Date.parse(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(valueMs) || new Date(valueMs).toISOString().slice(0,10)!==value) throw new Error('INVALID_FAMILY_PERIOD')
  return valueMs/86400000
}
const gcd=(a:bigint,b:bigint):bigint=>b===BigInt(0)?a:gcd(b,a%b)
/** Sum remaining fractions of actual calendar-month cycles in already-paid periods.
 * Round half up once per additional person, then multiply the persisted unit price
 * by quantity. This is also the exact QBO line-item arithmetic. No 30-day guess. */
export function quoteFamilyProration(plan:Plan,count:number,asOf:string,expiresAt:string,periods:PaidFamilyPeriod[]) {
  assertAdditionalCount(count)
  if (!count || periods.length>1200 || day(asOf)>=day(expiresAt)) throw new Error('FAMILY_ADDITION_NOT_ELIGIBLE')
  const sorted=[...periods].sort((a,b)=>a.startsAt.localeCompare(b.startsAt))
  let numerator=BigInt(0),denominator=BigInt(1),coveredUntil=asOf
  const cycles:{startsAt:string;expiresAt:string;chargedFrom:string;chargedDays:number;cycleDays:number}[]=[]
  for(let p=0;p<sorted.length;p++) {
    const period=sorted[p]
    if(day(period.startsAt)>=day(period.expiresAt) || (p>0 && day(sorted[p-1].expiresAt)>day(period.startsAt))) throw new Error('INVALID_FAMILY_PERIOD')
    if(period.expiresAt<=asOf || period.startsAt>=expiresAt)continue
    if(period.startsAt>coveredUntil)throw new Error('FAMILY_UNPAID_PERIOD')
    for(let month=0,from=period.startsAt;from<period.expiresAt;month++) {
      if(month>=120)throw new Error('INVALID_FAMILY_PERIOD')
      const next=addMembershipMonths(period.startsAt,month+1)
      const until=next<period.expiresAt?next:period.expiresAt
      const chargedFrom=from<asOf?asOf:from,chargedUntil=until>expiresAt?expiresAt:until
      if(chargedUntil>chargedFrom) {
        const chargedDays=day(chargedUntil)-day(chargedFrom),cycleDays=day(next)-day(from)
        numerator=numerator*BigInt(cycleDays)+BigInt(chargedDays)*denominator
        denominator*=BigInt(cycleDays)
        const divisor=gcd(numerator,denominator);numerator/=divisor;denominator/=divisor
        cycles.push({startsAt:from,expiresAt:until,chargedFrom,chargedDays,cycleDays})
        coveredUntil=chargedUntil
      }
      from=until
    }
  }
  if(coveredUntil!==expiresAt || numerator<=BigInt(0))throw new Error('FAMILY_UNPAID_PERIOD')
  const monthlyCents=additionalFamilyMonthlyCents(plan)
  const perMemberCents=Number((BigInt(monthlyCents)*numerator*BigInt(2)+denominator)/(denominator*BigInt(2)))
  const totalCents=perMemberCents*count
  if(!Number.isSafeInteger(totalCents) || totalCents<=0)throw new Error('INVALID_FAMILY_QUOTE')
  return {version:FAMILY_PRORATION_VERSION,asOf,expiresAt,count,monthlyCents,perMemberCents,totalCents,
    monthNumerator:numerator.toString(),monthDenominator:denominator.toString(),cycles}
}
