'use client'
import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import type { NativeRequest } from './NativeSalesModule'

type Status = 'loading' | 'unavailable' | 'disconnected' | 'connected'

/** The server makes every authorization decision; this panel never handles tokens. */
export default function NativeQboConnection({ request }: { request: NativeRequest }) {
  const { t } = useT()
  const [status,setStatus] = useState<Status>('loading')
  const [company,setCompany] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const refresh = useCallback(async () => {
    try {
      const result = await request('quickbooks/connection')
      const name = result.company && typeof result.company === 'object' &&
        'companyName' in result.company ? String(result.company.companyName) : ''
      setCompany(name)
      setStatus('connected')
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setStatus(code === 'QBO_NOT_CONNECTED' ? 'disconnected' : 'unavailable')
    }
  },[request])
  useEffect(() => { void refresh() },[refresh])
  const connect = async () => {
    setBusy(true); setMessage('')
    try {
      const result = await request('quickbooks/oauth/start',{ method:'POST' })
      if (typeof result.url !== 'string' ||
        !result.url.startsWith('https://appcenter.intuit.com/connect/oauth2?'))
        throw new Error('QBO_AUTHORIZATION_UNAVAILABLE')
      window.location.assign(result.url)
    } catch { setMessage(t('salesNative.qboConnectionUnavailable')); setBusy(false) }
  }
  const disconnect = async () => {
    if (!window.confirm(t('salesNative.qboDisconnectConfirm'))) return
    setBusy(true); setMessage('')
    try {
      await request('quickbooks/oauth/disconnect',{ method:'POST' })
      setStatus('disconnected');setCompany('')
    } catch { setMessage(t('salesNative.qboDisconnectFailed')) }
    finally { setBusy(false) }
  }
  const verifyRefresh = async () => {
    setBusy(true); setMessage('')
    try {
      const result = await request('quickbooks/connection',{ method:'POST' })
      const name = result.company && typeof result.company === 'object' &&
        'companyName' in result.company ? String(result.company.companyName) : ''
      setCompany(name)
      setMessage(t('salesNative.qboRefreshVerified'))
    } catch { setMessage(t('salesNative.qboRefreshFailed')) }
    finally { setBusy(false) }
  }
  if (status === 'unavailable') return null
  return <section aria-label={t('salesNative.qboConnectionLabel')}>
    <h2>QuickBooks · Eminat Medical Center</h2>
    {status === 'loading' ? <p>{t('salesNative.qboCheckingConnection')}</p> :
      status === 'connected' ? <><p>{t('salesNative.qboConnectedLabel')} {company}</p>
        <button type="button" disabled={busy} onClick={verifyRefresh}>{t('salesNative.qboVerifyRefresh')}</button>
        <button type="button" disabled={busy} onClick={disconnect}>{t('salesNative.qboDisconnect')}</button></> :
      <><p>{t('salesNative.qboNotConnected')}</p>
        <button type="button" disabled={busy} onClick={connect}>{t('salesNative.qboConnect')}</button></>}
    {message && <p role="alert">{message}</p>}
  </section>
}
