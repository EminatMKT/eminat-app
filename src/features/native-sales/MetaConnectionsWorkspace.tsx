'use client'
import { useCallback } from 'react'
import AppShell from '@/shared/components/shell/AppShell'
import NativeSocialStatus from './NativeSocialStatus'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './MetaConnections.module.css'
import {metaSettingsHref,META_SETTINGS_PATH} from './meta-navigation'
import { sessionFetch } from './session-fetch'
export default function MetaConnectionsWorkspace({ organizations, organizationId, company, central=false }: {
  central?:boolean; organizations: { organizationId:string; name:string }[]; organizationId?:string; company?:string
}) {
  const { t } = useT()
  const request: NativeRequest = useCallback(async (path,options={}) => {
    if (!organizationId) throw new Error('AUTHENTICATION_REQUIRED')
    return sessionFetch(path, { method: options.method, payload: options.payload, organizationId })
  },[organizationId])
  return <AppShell><div className={s.workspace}>
    <a className={s.back} href={central ? metaSettingsHref(organizationId,company,'/settings/integrations') : organizationId ? `/sales-native?organization=${organizationId}&tab=settings` : '/sales-native'}>{t('meta.integrations')}</a>
    <h1>{t('meta.connectionsTitle')}</h1>
    <p>{t('meta.dashboardDescription')}</p>
    {organizationId && <p>{t('meta.currentOrganization')}: <strong>{organizations.find(org=>org.organizationId===organizationId)?.name}</strong></p>}
    <form action={central ? META_SETTINGS_PATH : '/sales-native/integrations/meta'} method="get">
      <label>{t('meta.organization')} <select name="organization" defaultValue={organizationId ?? ''} required>
        <option value="">{t('meta.chooseOrganization')}</option>
        {organizations.map(org => <option key={org.organizationId} value={org.organizationId}>{org.name}</option>)}
      </select></label><button type="submit">{t('meta.openWorkspace')}</button>
    </form>
    {organizationId && <NativeSocialStatus key={organizationId} request={request} companyCode={company} manageCompanies />}
  </div></AppShell>
}
