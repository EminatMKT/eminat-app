import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import { DEFAULT_URL, URL } from '../constants'

export const APP_HOME = 'http://localhost:3000/'
export const LOCAL_API = DEFAULT_URL
export const RECORDS_TABLE = `${URL}/rest/v1/billing_v2_records`
export const RECORDS_WRITES = '**/rest/v1/billing_v2_records**'
export const WRITE_METHODS = ['POST', 'PATCH']
export const BROKEN_WRITE = { status: 500, body: '{}' }
export const CREATED = 201
export const HOLDER_EMAIL = 'billing.holder.e2e@eminat.net'
export const HOLDER_ROLE = 'finanzas'
export const HOLDER_NAME = ['Billing', 'Holder'] as const
export const OUTSIDER_EMAIL = 'billing.outsider.e2e@eminat.net'
export const OUTSIDER_ROLE = DEFAULT_ROLE
export const OUTSIDER_NAME = ['Billing', 'Outsider'] as const
export const LOGIN_PATH = '/login'
export const LOGIN_PLACEHOLDER = 'tu@eminat.net'
export const PASSWORD_BOX = 'input[type="password"]'
export const HOME_TEXT = 'Home'
export const ONBOARDING_DONE = ['eminat-onboarding-completed', 'true'] as const
export const LOGIN_WAIT = { timeout: 40000 }
export const PROFILE_WAIT = { timeout: 20000 }
export const RUN = `e2e-bv2-${Date.now()}`
export const PAYEE = `${RUN} payee`
export const TODAY = new Date('2026-09-15T12:00:00-05:00')
export const ZERO_MONEY = /\$\s?0[.,]00/

// The fixed inputs of the billing v2 e2e; only the two local hosts above may be written to.
// The holder is a non-admin whose dynamic grant includes billing, the outsider has none. Every
// record carries the run tag and is deleted by the id this run stored.

// The clock is frozen near the real date: a token issued now still looks valid at that instant.
// Zero money matches either decimal separator, so no check hangs on the ICU build.
