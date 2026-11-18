'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Integration = { id: string; provider_code: string; status: string;
  external_business_name: string | null; connected_at: string | null;
  token_expires_at: string | null; last_refresh_at: string | null;
  last_error_code: string | null }
type Asset = { id: string; asset_type: string; display_name: string | null;
  status: string; webhook_status: string; last_event_at: string | null; last_error_code?: string | null }
type LeadAdsPolicy = { pageId: string; approvedFormIds: string[]; excludedFormIds: string[];
  receipts: { id: string; status: string; error_code: string | null; received_at: string; processed_at: string | null }[] }
type GrantPage = { id: string; name: string; tasks: string[];
  business: { id: string; name?: string } | null; instagramAccountId: string | null }

export default function NativeSocialStatus({ request, role, users, teams }: { request: NativeRequest;
  role: string; users: { memberId: string; displayName: string }[];
  teams: { id: string; name: string }[] }) {
  const { t } = useT()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [leadAdsPolicy, setLeadAdsPolicy] = useState<LeadAdsPolicy | null>(null)
  const [metaAvailable, setMetaAvailable] = useState(false)
  const [owner, setOwner] = useState('')
  const [team, setTeam] = useState('')
  const [grantState, setGrantState] = useState('')
  const [pages, setPages] = useState<GrantPage[]>([])
  const [selectedPage, setSelectedPage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canManage = role === 'SUPERADMIN' || role === 'ADMINISTRATOR'
  useEffect(() => {
    if (!canManage) { setLoading(false); return }
    let cancelled = false
    void request('social/connections').then(result => {
      if (cancelled) return
      const data = result.data as { integrations?: Integration[]; assets?: Asset[];
        metaAvailable?: boolean; leadAdsPolicy?: LeadAdsPolicy | null } | null
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : [])
      setAssets(Array.isArray(data?.assets) ? data.assets : [])
      setMetaAvailable(data?.metaAvailable === true)
      setLeadAdsPolicy(data?.leadAdsPolicy ?? null)
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'SOCIAL_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [canManage, request])
  useEffect(() => {
    if (!canManage) return
    const params = new URLSearchParams(window.location.search)
    const state = params.get('metaState') ?? ''
    const reason = params.get('metaError')
    if (reason) setError(reason)
    if (!state) return
    setGrantState(state)
    let cancelled = false
    void request(`social/meta/pages?${new URLSearchParams({ state })}`).then(result => {
      if (!cancelled) setPages(Array.isArray(result.data) ? result.data as GrantPage[] : [])
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'META_GRANT_UNAVAILABLE')
    })
    return () => { cancelled = true }
  }, [canManage, request])
  const start = async () => {
    if (!owner || busy) return
    setBusy(true); setError('')
    try {
      const result = await request('social/meta/connect', { method: 'POST',
        payload: { ownerMemberId: owner, teamId: team || null } })
      const data = result.data as { url?: unknown } | null
      if (typeof data?.url !== 'string' || new URL(data.url).origin !== 'https://www.facebook.com')
        throw new Error('META_CONNECTION_UNAVAILABLE')
      window.location.assign(data.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'META_CONNECTION_UNAVAILABLE')
      setBusy(false)
    }
  }
  const complete = async () => {
    if (!grantState || !selectedPage || busy) return
    setBusy(true); setError('')
    try {
      await request('social/meta/complete', { method: 'POST',
        payload: { state: grantState, pageId: selectedPage } })
      const url = new URL(window.location.href)
      url.searchParams.delete('metaState'); url.searchParams.delete('metaError')
      window.history.replaceState(null, '', url)
      setGrantState(''); setPages([]); setSelectedPage('')
      const result = await request('social/connections')
      const data = result.data as { integrations?: Integration[]; assets?: Asset[] } | null
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : [])
      setAssets(Array.isArray(data?.assets) ? data.assets : [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'META_CONNECTION_UNAVAILABLE') }
    finally { setBusy(false) }
  }
  const subscribe = async (assetId: string) => {
    if (busy) return
    setBusy(true); setError('')
    try {
      await request('social/meta/subscribe', { method: 'POST', payload: { assetId } })
      setAssets(current => current.map(item => item.id === assetId ?
        { ...item, status: 'SUBSCRIBED', webhook_status: 'SUBSCRIBED' } : item))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'META_SUBSCRIPTION_FAILED') }
    finally { setBusy(false) }
  }
  const revoke = async (integrationId: string) => {
    if (busy || !window.confirm('Disconnect this Meta connection? Stored tokens will be removed.')) return
    setBusy(true); setError('')
    try {
      await request('social/meta/revoke', { method: 'POST', payload: { integrationId } })
      const result = await request('social/connections')
      const data = result.data as { integrations?: Integration[]; assets?: Asset[] } | null
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : [])
      setAssets(Array.isArray(data?.assets) ? data.assets : [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'META_CONNECTION_UNAVAILABLE') }
    finally { setBusy(false) }
  }
  const refresh = async (integrationId: string) => {
    if (busy) return
    setBusy(true); setError('')
    try {
      await request('social/meta/refresh', { method: 'POST', payload: { integrationId } })
      const result = await request('social/connections')
      const data = result.data as { integrations?: Integration[]; assets?: Asset[] } | null
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : [])
      setAssets(Array.isArray(data?.assets) ? data.assets : [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'META_REFRESH_UNAVAILABLE') }
    finally { setBusy(false) }
  }
  if (!canManage) return <section className={s.panel}><h2>{t('salesNative.social')}</h2>
    <p>{t('salesNative.socialConnectionSettingsAreAvailableToSalesAdministrators')}</p></section>
  return <div className={s.reportGrid}>
    <section className={s.panel}><h2>{t('salesNative.connections')}</h2>
      {loading && <p role="status">{t('salesNative.loadingConnections')}</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      {!loading && !error && integrations.length === 0 && <p>{t('salesNative.noSocialConnectionIsActive')}</p>}
      <ul className={s.breakdown}>{integrations.map(item => <li key={item.id}>
        <span>{item.provider_code} · {item.external_business_name || t('salesNative.businessNotSelected')}</span>
        <strong>{item.status}</strong>
        {item.provider_code === 'META' && item.token_expires_at &&
          <span>{Date.parse(item.token_expires_at) > Date.now() ? t('salesNative.tokenExpires') : t('salesNative.tokenExpired')} ·
            {' '}{new Date(item.token_expires_at).toLocaleDateString()}</span>}
        {item.provider_code === 'META' && metaAvailable &&
          ['CONNECTED', 'DEGRADED'].includes(item.status) && item.token_expires_at &&
          Date.parse(item.token_expires_at) > Date.now() &&
          <button type="button" disabled={busy} onClick={() => void refresh(item.id)}>
            {t('salesNative.refreshAccess')}</button>}
        {item.provider_code === 'META' && ['CONNECTED', 'DEGRADED'].includes(item.status) &&
          <button type="button" disabled={busy} onClick={() => void revoke(item.id)}>
            {t('salesNative.disconnect')}</button>}</li>)}</ul>
      {!metaAvailable && <p>{t('salesNative.metaConnectionIsAwaitingPrivateAppConfigurationAnd')}</p>}
      {metaAvailable && !grantState && <div className={s.form}>
        <label>{t('salesNative.auditLeadOwner')}<select value={owner} onChange={event => setOwner(event.target.value)}>
          <option value="">{t('salesNative.chooseAnAuthorizedSalesOwner')}</option>
          {users.map(user => <option key={user.memberId} value={user.memberId}>{user.displayName}</option>)}
        </select></label>
        <label>{t('salesNative.team')}<select value={team} onChange={event => setTeam(event.target.value)}>
          <option value="">{t('salesNative.noTeam')}</option>
          {teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <button type="button" disabled={!owner || busy} onClick={() => void start()}>
          Connect existing Meta Page</button>
      </div>}
      {grantState && <div className={s.form}>
        <label>{t('salesNative.auditAuthorizedPage')}<select value={selectedPage} onChange={event => setSelectedPage(event.target.value)}>
          <option value="">{t('salesNative.chooseOnePage')}</option>
          {pages.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <button type="button" disabled={!selectedPage || busy} onClick={() => void complete()}>
          Connect selected Page</button>
      </div>}
    </section>
    <section className={s.panel}><h2>{t('salesNative.pagesAndAssets')}</h2>
      {!loading && !error && assets.length === 0 && <p>{t('salesNative.noPageOrAssetIsConnected')}</p>}
      <ul className={s.breakdown}>{assets.map(item => <li key={item.id}>
        <span>{item.display_name || item.asset_type} · {item.asset_type}</span>
        <strong>{item.status} · {item.webhook_status}</strong>
        {item.last_event_at && <span>{t('salesNative.metaLastSuccessfulLead')} · {new Date(item.last_event_at).toLocaleString()}</span>}
        {item.last_error_code && <span>{item.last_error_code}</span>}
        {metaAvailable && item.asset_type === 'page' && item.status === 'READY' &&
          <button type="button" disabled={busy} onClick={() => void subscribe(item.id)}>
            Subscribe Lead Ads</button>}</li>)}</ul>
    </section>
    {leadAdsPolicy && <section className={s.panel}><h2>{t('salesNative.metaLeadAds')}</h2>
      <p>{t('salesNative.metaLeadBoundary')}</p>
      <p>{t('salesNative.metaApprovedForms')} · {leadAdsPolicy.approvedFormIds.join(', ')}</p>
      <p>{t('salesNative.metaExcludedForms')} · {leadAdsPolicy.excludedFormIds.join(', ')}</p>
      {!leadAdsPolicy.receipts.length && <p>{t('salesNative.metaNoReceipts')}</p>}
      <ul className={s.breakdown}>{leadAdsPolicy.receipts.map(receipt => <li key={receipt.id}>
        <span>{new Date(receipt.received_at).toLocaleString()}</span>
        <strong>{receipt.status}</strong>{receipt.error_code && <span>{receipt.error_code}</span>}
      </li>)}</ul>
    </section>}
  </div>
}
