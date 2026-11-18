'use client'
import { useCallback } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import { supabase } from '@/shared/db/supabase'
import NativeSocialStatus from './NativeSocialStatus'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './MetaConnections.module.css'
export default function MetaConnectionsWorkspace({ organizations, organizationId, company }: {
  organizations: { organizationId:string; name:string }[]; organizationId?:string; company?:string
}) {
  const { t } = useT()
  const request: NativeRequest = useCallback(async (path,options={}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !organizationId) throw new Error('AUTHENTICATION_REQUIRED')
    const response = await fetch(`/api/sales-native/${path}`, { cache:'no-store', method:options.method ?? 'GET',
      headers:{ Authorization:`Bearer ${session.access_token}`, 'X-Sales-Organization-Id':organizationId,
        ...(options.payload ? { 'Content-Type':'application/json' } : {}) },
      body:options.payload ? JSON.stringify(options.payload) : undefined })
    const result = await response.json()
    if (!response.ok) throw new Error(result.code || 'META_CONNECTION_UNAVAILABLE')
    return result
  },[organizationId])
  return <AppShell><div className={s.workspace}>
    <h1>{t('meta.connectionsTitle')}</h1>
    <p>{t('meta.connectionOnly')}</p>
    {organizationId && <p>{t('meta.currentOrganization')}: <strong>{organizations.find(org=>org.organizationId===organizationId)?.name}</strong></p>}
    <form action="/sales-native/integrations/meta" method="get">
      <label>{t('meta.organization')} <select name="organization" defaultValue={organizationId ?? ''} required>
        <option value="">{t('meta.chooseOrganization')}</option>
        {organizations.map(org => <option key={org.organizationId} value={org.organizationId}>{org.name}</option>)}
      </select></label><button type="submit">{t('meta.openWorkspace')}</button>
    </form>
    {organizationId && <NativeSocialStatus key={organizationId} request={request} companyCode={company} />}
  </div></AppShell>
}
