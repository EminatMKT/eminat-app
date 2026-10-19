'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type Integration = { id: string; provider_code: string; status: string;
  external_business_name: string | null; connected_at: string | null }
type Asset = { id: string; asset_type: string; display_name: string | null;
  status: string; webhook_status: string; last_event_at: string | null }
type GrantPage = { id: string; name: string; tasks: string[];
  business: { id: string; name?: string } | null; instagramAccountId: string | null }

export default function NativeSocialStatus({ request, role, users, teams }: { request: NativeRequest;
  role: string; users: { memberId: string; displayName: string }[];
  teams: { id: string; name: string }[] }) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
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
        metaAvailable?: boolean } | null
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : [])
      setAssets(Array.isArray(data?.assets) ? data.assets : [])
      setMetaAvailable(data?.metaAvailable === true)
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
  if (!canManage) return <section className={s.panel}><h2>Social</h2>
    <p>Social connection settings are available to Sales administrators.</p></section>
  return <div className={s.reportGrid}>
    <section className={s.panel}><h2>Connections</h2>
      {loading && <p role="status">Loading connections…</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      {!loading && !error && integrations.length === 0 && <p>No Social connection is active.</p>}
      <ul className={s.breakdown}>{integrations.map(item => <li key={item.id}>
        <span>{item.provider_code} · {item.external_business_name || 'Business not selected'}</span>
        <strong>{item.status}</strong></li>)}</ul>
      {!metaAvailable && <p>Meta connection is awaiting private app configuration and Page permissions.</p>}
      {metaAvailable && !grantState && <div className={s.form}>
        <label>Lead owner<select value={owner} onChange={event => setOwner(event.target.value)}>
          <option value="">Choose an authorized Sales owner</option>
          {users.map(user => <option key={user.memberId} value={user.memberId}>{user.displayName}</option>)}
        </select></label>
        <label>Team<select value={team} onChange={event => setTeam(event.target.value)}>
          <option value="">No team</option>
          {teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <button type="button" disabled={!owner || busy} onClick={() => void start()}>
          Connect existing Meta Page</button>
      </div>}
      {grantState && <div className={s.form}>
        <label>Authorized Page<select value={selectedPage} onChange={event => setSelectedPage(event.target.value)}>
          <option value="">Choose one Page</option>
          {pages.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <button type="button" disabled={!selectedPage || busy} onClick={() => void complete()}>
          Connect selected Page</button>
      </div>}
    </section>
    <section className={s.panel}><h2>Pages and assets</h2>
      {!loading && !error && assets.length === 0 && <p>No Page or asset is connected.</p>}
      <ul className={s.breakdown}>{assets.map(item => <li key={item.id}>
        <span>{item.display_name || item.asset_type} · {item.asset_type}</span>
        <strong>{item.status} · {item.webhook_status}</strong>
        {metaAvailable && item.asset_type === 'page' && item.status === 'READY' &&
          <button type="button" disabled={busy} onClick={() => void subscribe(item.id)}>
            Subscribe Lead Ads</button>}</li>)}</ul>
    </section>
  </div>
}
