/** Corazón Salud Sales pricing, ported from ANNIE's verified commercial rules.
 * This module is pure and uses integer USD cents. It never calls ANNIE.
 */
export const plans = ['ESSENTIAL', 'PLUS', 'MAX'] as const
export const membershipTypes = ['INDIVIDUAL', 'FAMILY'] as const
export const saleDurations = ['MONTHLY', '3M', '6M', '12M'] as const
export type Plan = (typeof plans)[number]
export type MembershipType = (typeof membershipTypes)[number]
export type SaleDuration = (typeof saleDurations)[number]
export type HistoricalDuration = SaleDuration | '2M' | 'LEGACY_UNSPECIFIED'

type FixedPrice = { individual: number; family: number; visits: number }
type Rates = {
  individualMonthly: number
  familyMonthly: number
  visitFee: number
  fixed: Record<'2M' | '3M' | '6M' | '12M', FixedPrice>
}

export const rates: Record<Plan, Rates> = {
  ESSENTIAL: {
    individualMonthly: 4999, familyMonthly: 8999, visitFee: 2500,
    fixed: {
      '2M': { individual: 9998, family: 17998, visits: 2 },
      '3M': { individual: 14997, family: 26997, visits: 2 },
      '6M': { individual: 29994, family: 53994, visits: 3 },
      '12M': { individual: 59988, family: 107988, visits: 4 },
    },
  },
  PLUS: {
    individualMonthly: 6999, familyMonthly: 10999, visitFee: 1500,
    fixed: {
      '2M': { individual: 13998, family: 21998, visits: 2 },
      '3M': { individual: 20997, family: 32997, visits: 2 },
      '6M': { individual: 41994, family: 65994, visits: 4 },
      '12M': { individual: 83988, family: 131988, visits: 6 },
    },
  },
  MAX: {
    individualMonthly: 8999, familyMonthly: 13999, visitFee: 0,
    fixed: {
      '2M': { individual: 17998, family: 27998, visits: 2 },
      '3M': { individual: 26997, family: 41997, visits: 2 },
      '6M': { individual: 53994, family: 83994, visits: 4 },
      '12M': { individual: 107988, family: 167988, visits: 8 },
    },
  },
}

export function quoteMembership(plan: Plan, type: MembershipType, duration: SaleDuration) {
  const price = rates[plan]
  const family = type === 'FAMILY'
  const initialMonths = duration === 'MONTHLY' ? 2 : Number(duration.slice(0, -1))
  const monthlyCents = (family ? price.familyMonthly : price.individualMonthly) +
    (duration === 'MONTHLY' ? 1000 : 0)
  const fixed = duration === 'MONTHLY' ? price.fixed['2M'] : price.fixed[duration]
  return {
    plan, type, duration, initialMonths, monthlyCents,
    totalCents: duration === 'MONTHLY' ? monthlyCents * 2 : (family ? fixed.family : fixed.individual),
    visitFeeCents: price.visitFee,
    includedVisits: fixed.visits,
  }
}

export function addMembershipMonths(day: string, months: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(months) || months < 1 || months > 120)
    throw new Error('INVALID_MEMBERSHIP_DATE')
  const date = new Date(`${day}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day)
    throw new Error('INVALID_MEMBERSHIP_DATE')
  const originalDay = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(originalDay, lastDay))
  return date.toISOString().slice(0, 10)
}

/** Historical 2M records are readable, but no new sale path accepts 2M. */
export function isSaleDuration(value: unknown): value is SaleDuration {
  return typeof value === 'string' && (saleDurations as readonly string[]).includes(value)
}
