'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Payment = { id: string; amount: string; currency: string; paid_at: string;
  reference?: string | null; used: boolean }

export default function NativePaymentHistory({ opportunityId, request }: {
  opportunityId: string; request: NativeRequest
}) {
  const { t } = useT()
  const [payments, setPayments] = useState<Payment[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!opportunityId) return
    let cancelled = false
    void request(`opportunities/${opportunityId}/payments`).then(result => {
      if (!cancelled) setPayments(Array.isArray(result.data) ? result.data as Payment[] : [])
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'PAYMENTS_UNAVAILABLE') })
    return () => { cancelled = true }
  }, [opportunityId, request])
  return <section className={s.recordActions}>
    <h3>{t('salesNative.recordedPaymentHistory')}</h3>
    {!opportunityId && <p className={s.caption}>{t('salesNative.noLinkedOpportunity')}</p>}
    {opportunityId && !payments.length && !error && <p className={s.caption}>{t('salesNative.noPaymentEvidence')}</p>}
    {payments.map(payment => <p key={payment.id}>{payment.paid_at} · {payment.currency} {payment.amount}
      {payment.reference ? ` · ${payment.reference}` : ''} · {payment.used ? t('salesNative.applied') : t('salesNative.unapplied')}</p>)}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
