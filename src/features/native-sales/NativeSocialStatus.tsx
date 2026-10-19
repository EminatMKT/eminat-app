'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type Integration = { id: string; provider_code: string; status: string;
  external_business_name: string | null; connected_at: string | null }
type Asset = { id: string; asset_type: string; display_name: string | null;
  status: string; webhook_status: string; last_event_at: string | null }

export default function NativeSocialStatus({ request, role }: { request: NativeRequest; role: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canManage = role === 'SUPERADMIN' || role === 'ADMINISTRATOR'
  useEffect(() => {
    if (!canManage) { setLoading(false); return }
    let cancelled = false
    void request('social/connections').then(result => {
      if (cancelled) return
      const data = result.data as { integrations?: Integration[]; assets?: Asset[] } | null
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : [])
      setAssets(Array.isArray(data?.assets) ? data.assets : [])
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'SOCIAL_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [canManage, request])
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
    </section>
    <section className={s.panel}><h2>Pages and assets</h2>
      {!loading && !error && assets.length === 0 && <p>No Page or asset is connected.</p>}
      <ul className={s.breakdown}>{assets.map(item => <li key={item.id}>
        <span>{item.display_name || item.asset_type} · {item.asset_type}</span>
        <strong>{item.status} · {item.webhook_status}</strong></li>)}</ul>
    </section>
  </div>
}
