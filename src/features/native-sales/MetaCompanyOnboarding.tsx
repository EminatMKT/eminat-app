'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './MetaConnections.module.css'

type Company = { code: string; name: string; enabled: boolean; relationship: string | null }
export default function MetaCompanyOnboarding({ request, onChanged, disabled }: {
  request: NativeRequest; onChanged: () => Promise<void>; disabled: boolean
}) {
  const { t } = useT()
  const [companies, setCompanies] = useState<Company[]>([])
  const [company, setCompany] = useState('')
  const [relationship, setRelationship] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    let cancelled = false
    void request('social/companies').then(result => {
      if (!Array.isArray(result.data)) throw new Error('META_COMPANY_UNAVAILABLE')
      if (!cancelled) setCompanies(result.data as Company[])
    }).catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request])
  const manage = async (code: string, active: boolean, declaration: string | null) => {
    if (busy || disabled) return
    if (!active && !window.confirm(t('meta.companyDisableConfirm'))) return
    setBusy(true); setError(false); setSaved(false)
    try {
      await request('social/companies', { method: 'POST', payload: {
        companyCode: code, active, relationship: declaration, acknowledged: true,
      } })
      const result = await request('social/companies')
      if (!Array.isArray(result.data)) throw new Error('META_COMPANY_UNAVAILABLE')
      setCompanies(result.data as Company[])
      setCompany(''); setAcknowledged(false)
      await onChanged(); setSaved(true)
    } catch { setError(true) } finally { setBusy(false) }
  }
  return <details className={s.onboarding}>
    <summary>{t('meta.manageCompanies')}</summary>
    <p>{t('meta.companyAccessNotice')}</p>
    {loading && <p role="status">{t('salesNative.loadingConnections')}</p>}
    {error && <p role="alert">{t('meta.companySetupError')}</p>}
    {saved && <p role="status">{t('meta.companySaved')}</p>}
    {!loading && !error && !companies.length && <p>{t('meta.companyAccessRequired')}</p>}
    <ul className={s.companyList}>{companies.filter(c => c.enabled).map(c => <li key={c.code}>
      <span>{c.name}</span>
      <button type="button" disabled={busy || disabled} onClick={() => void manage(c.code, false, c.relationship)}>
        {t('meta.disableCompany')}
      </button>
    </li>)}</ul>
    {companies.some(c => !c.enabled) && <form onSubmit={event => {
      event.preventDefault()
      if (acknowledged && companies.some(c => c.code === company && !c.enabled)) void manage(company, true, relationship)
    }}>
      <fieldset disabled={busy || disabled}>
        <legend>{t('meta.enableCompany')}</legend>
        <label>{t('meta.onboardingCompany')} <select value={company} required onChange={event => {
          setCompany(event.target.value); setAcknowledged(false); setSaved(false)
        }}>
          <option value="">{t('meta.chooseCompany')}</option>
          {companies.filter(c => !c.enabled).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select></label>
        <label>{t('meta.relationship')} <select value={relationship} required onChange={event => {
          setRelationship(event.target.value); setAcknowledged(false)
        }}>
          <option value="">{t('meta.chooseRelationship')}</option>
          <option value="OWNER_ASSERTED">{t('meta.ownerAsserted')}</option>
          <option value="AGENCY_DELEGATED">{t('meta.agencyDelegated')}</option>
        </select></label>
        <label className={s.check}><input type="checkbox" required checked={acknowledged}
          onChange={event => setAcknowledged(event.target.checked)} />{t('meta.companyAcknowledgement')}</label>
        <button type="submit" disabled={!company || !relationship || !acknowledged}>{t('meta.enableCompany')}</button>
      </fieldset>
    </form>}
  </details>
}
