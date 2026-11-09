import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('membership entitlement email preference correction', () => {
  it('changes only the historical suppression guard, preserving payment, role, audit and replay checks', () => {
    const before = readFileSync('supabase/migrations/20261020230000_patient_manual_qbo_verification.sql', 'utf8')
      .split('CREATE OR REPLACE FUNCTION public.native_sales_issue_membership(')[1]
      .split('\n$$;')[0]
    const after = readFileSync('supabase/migrations/20261026103000_native_sales_membership_email_preference.sql', 'utf8')
      .split('CREATE OR REPLACE FUNCTION public.native_sales_issue_membership(')[1]
      .split('\n$$;')[0]
    const guard = "  IF v_contact.do_not_email AND NOT p_is_demo THEN\n    RAISE EXCEPTION 'CONTACT_EMAIL_SUPPRESSED' USING ERRCODE='22023';\n  END IF;\n"
    expect(before).toContain(guard)
    expect(after).toBe(before.replace(guard, ''))
  })
})
