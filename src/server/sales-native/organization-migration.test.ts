import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('approved EMC administrator compatibility boundary', () => {
  it('changes only the exact fallback membership status guard in the Patient profile function', () => {
    const read = (name: string) => readFileSync(resolve('supabase/migrations', name), 'utf8')
    const previous = read('20261020120000_patient_emc_sales_operations.sql')
    const next = read('20261025160000_native_sales_organization_context.sql')
    const claim = (source: string) => {
      const start = source.indexOf('CREATE OR REPLACE FUNCTION public.native_sales_patient_claim_contact(')
      return source.slice(start, source.indexOf('\n$$;', start) + 4)
    }
    expect(claim(next)).toBe(claim(previous).replace(
      "status='pending' AND role='SUPERADMIN'", "status IN ('pending','active') AND role='SUPERADMIN'"))
  })
})
