'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'

export type SalesAccess = {
  loading: boolean
  allowed: boolean
  role?: string
  canWrite: boolean
  canReassign: boolean
  canReadAudit: boolean
  writeEnabled: boolean
  contactWriteEnabled: boolean
  accountWriteEnabled: boolean
  opportunityWriteEnabled: boolean
  importEnabled: boolean
  interactionEnabled: boolean
  emailEnabled: boolean
}

const denied: SalesAccess = {
  loading: false, allowed: false, canWrite: false, canReassign: false,
  canReadAudit: false, writeEnabled: false, contactWriteEnabled: false,
  accountWriteEnabled: false, opportunityWriteEnabled: false, importEnabled: false,
  interactionEnabled: false,
  emailEnabled: false,
}

export function useSalesAccess(): SalesAccess {
  const [access, setAccess] = useState<SalesAccess>({ ...denied, loading: true })
  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return denied
      const response = await fetch('/api/integrations/annie/sales/access', {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) return denied
      const body = await response.json() as Partial<SalesAccess>
      if (body.allowed !== true) return denied
      return {
        loading: false, allowed: true, role: body.role,
        canWrite: body.canWrite === true,
        canReassign: body.canReassign === true,
        canReadAudit: body.canReadAudit === true,
        writeEnabled: body.writeEnabled === true,
        contactWriteEnabled: body.contactWriteEnabled === true,
        accountWriteEnabled: body.accountWriteEnabled === true,
        opportunityWriteEnabled: body.opportunityWriteEnabled === true,
        importEnabled: body.importEnabled === true,
        interactionEnabled: body.interactionEnabled === true,
        emailEnabled: body.emailEnabled === true,
      }
    }).then(value => { if (!cancelled) setAccess(value) })
      .catch(() => { if (!cancelled) setAccess(denied) })
    return () => { cancelled = true }
  }, [])
  return access
}

export function useSalesQaAccess(): boolean {
  return useSalesAccess().allowed
}
