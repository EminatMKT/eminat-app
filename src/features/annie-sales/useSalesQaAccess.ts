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
  leadWriteMode: 'disabled' | 'qa' | 'commercial'
  contactWriteMode: 'disabled' | 'qa' | 'commercial'
  accountWriteMode: 'disabled' | 'qa' | 'commercial'
  opportunityWriteMode: 'disabled' | 'qa' | 'commercial'
  activityWriteMode: 'disabled' | 'qa' | 'commercial'
  meetingWriteMode: 'disabled' | 'qa' | 'commercial'
  interactionWriteMode: 'disabled' | 'qa' | 'commercial'
  emailWriteMode: 'disabled' | 'qa' | 'commercial'
  contactWriteEnabled: boolean
  accountWriteEnabled: boolean
  opportunityWriteEnabled: boolean
  importEnabled: boolean
  interactionEnabled: boolean
  emailEnabled: boolean
  activityEnabled: boolean
  meetingEnabled: boolean
  membershipQaEnabled: boolean
  membershipWriteEnabled: boolean
  reportScheduleWriteEnabled: boolean
}

const denied: SalesAccess = {
  loading: false, allowed: false, canWrite: false, canReassign: false,
  canReadAudit: false, writeEnabled: false, contactWriteEnabled: false,
  leadWriteMode: 'disabled',
  contactWriteMode: 'disabled', accountWriteMode: 'disabled', opportunityWriteMode: 'disabled',
  activityWriteMode: 'disabled',
  meetingWriteMode: 'disabled',
  interactionWriteMode: 'disabled',
  emailWriteMode: 'disabled',
  accountWriteEnabled: false, opportunityWriteEnabled: false, importEnabled: false,
  interactionEnabled: false,
  emailEnabled: false,
  activityEnabled: false,
  meetingEnabled: false,
  membershipQaEnabled: false,
  membershipWriteEnabled: false,
  reportScheduleWriteEnabled: false,
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
      const leadMode: SalesAccess['leadWriteMode'] = body.leadWriteMode === 'qa' ||
        body.leadWriteMode === 'commercial' ? body.leadWriteMode : 'disabled'
      const mode = (value: unknown): SalesAccess['leadWriteMode'] =>
        value === 'qa' || value === 'commercial' ? value : 'disabled'
      return {
        loading: false, allowed: true, role: body.role,
        canWrite: body.canWrite === true,
        canReassign: body.canReassign === true,
        canReadAudit: body.canReadAudit === true,
        writeEnabled: body.writeEnabled === true,
        leadWriteMode: leadMode,
        contactWriteMode: mode(body.contactWriteMode),
        accountWriteMode: mode(body.accountWriteMode),
        opportunityWriteMode: mode(body.opportunityWriteMode),
        activityWriteMode: mode(body.activityWriteMode),
        meetingWriteMode: mode(body.meetingWriteMode),
        interactionWriteMode: mode(body.interactionWriteMode),
        emailWriteMode: mode(body.emailWriteMode),
        contactWriteEnabled: body.contactWriteEnabled === true,
        accountWriteEnabled: body.accountWriteEnabled === true,
        opportunityWriteEnabled: body.opportunityWriteEnabled === true,
        importEnabled: body.importEnabled === true,
        interactionEnabled: body.interactionEnabled === true,
        emailEnabled: body.emailEnabled === true,
        activityEnabled: body.activityEnabled === true,
        meetingEnabled: body.meetingEnabled === true,
        membershipQaEnabled: body.membershipQaEnabled === true,
        membershipWriteEnabled: body.membershipWriteEnabled === true,
        reportScheduleWriteEnabled: body.reportScheduleWriteEnabled === true,
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
