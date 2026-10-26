'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import NativePaymentHistory from './NativePaymentHistory'
import NativeMembershipRenewal from './NativeMembershipRenewal'
import NativePatientQbo from './NativePatientQbo'
import { allSalesPages } from './pagination'
import { useT } from '@/shared/i18n'
import { salesDisplayValue } from './display-value'
import s from './NativeSalesModule.module.css'

type Opportunity = { id: string; name: string; currency: string; amount: string | null }
type Membership = { id: string; code: string; plan: string; duration: string;
  expires_at: string; effectiveStatus: string; opportunity_id: string | null }

export default function NativePaymentsRenewals({ request, role, showPatientQbo }: {
  request: NativeRequest; role: string; showPatientQbo: boolean
}) {
  const { t } = useT()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [opportunityId, setOpportunityId] = useState('')
  const [membershipId, setMembershipId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    const load = async () => {
      try {
        const [opportunities,memberships] = await Promise.all([
          allSalesPages<Opportunity>(request,'opportunities',() => cancelled),
          allSalesPages<Membership>(request,'memberships',() => cancelled),
        ])
        if (!cancelled) { setOpportunities(opportunities); setMemberships(memberships) }
      } catch(cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'PAYMENTS_UNAVAILABLE')
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  },[request])
  const selected = memberships.find(item => item.id === membershipId)
  return <div className={s.reportGrid}>
    {showPatientQbo && <NativePatientQbo request={request} />}
    <section className={s.panel}>
      <h2>{t('salesNative.recordedPayments')}</h2>
      <p className={s.caption}>{t('salesNative.paymentsNotice')}</p>
      {loading ? <p role="status">{t('salesNative.loadingPayments')}</p> : <>
        <label className={s.form}>{t('salesNative.tabOpportunities')}
          <select value={opportunityId} onChange={event => setOpportunityId(event.target.value)}>
            <option value="">{t('salesNative.choosePermittedOpportunity')}</option>
            {opportunities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {opportunityId && <NativePaymentHistory key={opportunityId} opportunityId={opportunityId} request={request} />}
        {!opportunities.length && <p className={s.empty}>{t('salesNative.noPermittedOpportunities')}</p>}
      </>}
    </section>
    <section className={s.panel}>
      <h2>{t('salesNative.renewals')}</h2>
      {loading ? <p role="status">{t('salesNative.loadingMemberships')}</p> : <>
        <label className={s.form}>{t('salesNative.tabMemberships')}
          <select value={membershipId} onChange={event => setMembershipId(event.target.value)}>
            <option value="">{t('salesNative.choosePermittedMembership')}</option>
            {memberships.map(item => <option key={item.id} value={item.id}>
              {item.code} · {salesDisplayValue(item.effectiveStatus,t)} · {t('salesNative.expires')} {item.expires_at}
            </option>)}
          </select>
        </label>
        {selected && <NativeMembershipRenewal key={selected.id} membershipId={selected.id}
          currentPlan={selected.plan} currentDuration={selected.duration}
          expiresAt={selected.expires_at} role={role} request={request} />}
        {!memberships.length && <p className={s.empty}>{t('salesNative.noPermittedMemberships')}</p>}
      </>}
    </section>
    {error && <p role="alert" className={s.error}>{error}</p>}
  </div>
}
