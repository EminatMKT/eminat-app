'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { allSalesPages } from './pagination'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Renewal = { id:string;status:string;amountCents:number;invoiceState:string;invoiceNumber:string|null;
  paymentState:string;reconciliationState:string;startsAt:string|null;expiresAt:string|null;renewedAt:string|null }
export default function NativeOnlineRenewals({membershipId,request}:{membershipId:string;request:NativeRequest}) {
  const { t,intlLocale } = useT()
  const [rows,setRows] = useState<Renewal[]>([])
  const [error,setError] = useState(false)
  useEffect(() => {
    let cancelled = false
    void allSalesPages<Renewal>(request,`memberships/${membershipId}/online-renewals`,() => cancelled)
      .then(data => { if (!cancelled) setRows(data) }).catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  },[membershipId,request])
  return <section className={s.recordActions}><h3>{t('salesNative.onlineRenewals')}</h3>
    {error && <p role="alert">{t('salesNative.onlineRenewalsUnavailable')}</p>}
    {!rows.length && !error && <p>{t('salesNative.noOnlineRenewals')}</p>}
    {rows.map(row => <div key={row.id} className={s.panel}>
      <p>{t('salesNative.onlineRenewalIntent')}: {row.id}</p>
      <p>{t('salesNative.status')}: {row.status} · {new Intl.NumberFormat(intlLocale,{style:'currency',currency:'USD'}).format(row.amountCents/100)}</p>
      <p>{t('salesNative.qboInvoice')}: {row.invoiceNumber ?? '—'} · {row.invoiceState}</p>
      <p>{t('salesNative.qboPayment')}: {row.paymentState} · {t('salesNative.renewalReconciliation')}: {row.reconciliationState}</p>
      {row.renewedAt && row.startsAt && row.expiresAt && <p>{t('salesNative.verifiedRenewalPeriod')}: {row.startsAt} — {row.expiresAt}</p>}
    </div>)}
  </section>
}
