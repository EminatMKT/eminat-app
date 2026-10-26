'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { allSalesPages } from './pagination'
import { useT } from '@/shared/i18n'
import { salesDisplayValue } from './display-value'
import s from './NativeSalesModule.module.css'

type Renewal = { id:string;status:string;amountCents:number;invoiceState:string;invoiceNumber:string|null;
  paymentState:string;reconciliationState:string;startsAt:string|null;expiresAt:string|null;renewedAt:string|null }
export default function NativeOnlineRenewals({membershipId,request}:{membershipId:string;request:NativeRequest}) {
  const { t,intlLocale } = useT()
  const [rows,setRows] = useState<Renewal[]>([])
  const [error,setError] = useState(false)
  const [loading,setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setError(false);setLoading(true)
    void allSalesPages<Renewal>(request,`memberships/${membershipId}/online-renewals`,() => cancelled)
      .then(data => { if (!cancelled) setRows(data) }).catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  },[membershipId,request])
  return <section className={s.recordActions}><h3>{t('salesNative.onlineRenewals')}</h3>
    {error && <p role="alert">{t('salesNative.onlineRenewalsUnavailable')}</p>}
    {loading && <p role="status">{t('salesNative.loadingMemberships')}</p>}
    {!rows.length && !error && !loading && <p>{t('salesNative.noOnlineRenewals')}</p>}
    {!loading && rows.map(row => <div key={row.id} className={s.panel}>
      <p>{t('salesNative.onlineRenewalIntent')}: {row.id}</p>
      <p>{t('salesNative.status')}: {salesDisplayValue(row.status,t)} · {new Intl.NumberFormat(intlLocale,{style:'currency',currency:'USD'}).format(row.amountCents/100)}</p>
      <p>{t('salesNative.qboInvoice')}: {row.invoiceNumber ?? '—'} · {salesDisplayValue(row.invoiceState,t)}</p>
      <p>{t('salesNative.qboPayment')}: {salesDisplayValue(row.paymentState,t)} · {t('salesNative.renewalReconciliation')}: {salesDisplayValue(row.reconciliationState,t)}</p>
      {row.renewedAt && row.startsAt && row.expiresAt && <p>{t('salesNative.verifiedRenewalPeriod')}: {row.startsAt} — {row.expiresAt}</p>}
    </div>)}
  </section>
}
