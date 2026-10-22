'use client'
import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type Qbo = {
  verification_state: string; qbo_invoice_number: string | null;
  qbo_invoice_reference: string | null; qbo_customer_reference: string | null;
  qbo_item_reference: string | null;
  qbo_hosted_payment_url: string | null; qbo_qr_reference: string | null;
  qbo_invoice_status: string; qbo_payment_status: string;
  finance_verification_status: string; qbo_payment_verified_by: string | null;
  qbo_payment_verified_name: string | null;
  qbo_payment_verified_at: string | null; membership_activation_status: string;
  qa_synthetic: boolean;
}
type Enrollment = { id: string; opportunity_id: string; contact_name: string;
  plan: string; membership_type: string; duration: string; amount_cents: number;
  status: string; qbo: Qbo | null }

export default function NativePatientQbo({ request }: { request: NativeRequest }) {
  const { t } = useT()
  const [rows, setRows] = useState<Enrollment[]>([])
  const [canVerify, setCanVerify] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceReference, setInvoiceReference] = useState('')
  const [customerReference, setCustomerReference] = useState('')
  const [itemReference, setItemReference] = useState('')
  const [hostedUrl, setHostedUrl] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [confirmedAt, setConfirmedAt] = useState('')
  const [qaSynthetic, setQaSynthetic] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [activationConfirmation, setActivationConfirmation] = useState('')
  const [voidEvidence, setVoidEvidence] = useState('')
  const [voidConfirmation, setVoidConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const result = await request('patient-qbo')
    setRows(Array.isArray(result.data) ? result.data as Enrollment[] : [])
    setCanVerify(result.canVerify === true)
  }, [request])
  useEffect(() => { void load().catch(() => setError(t('salesNative.qboLoadError'))) }, [load])
  const selected = rows.find(row => row.id === selectedId)
  const selectionReview = selected?.status === 'CHANGE_REQUESTED' || selected?.status === 'CANCELLATION_REQUESTED'
  const amount = selected ? (selected.amount_cents / 100).toLocaleString('en-US',
    { style: 'currency', currency: 'USD' }) : ''
  async function act(action: 'RECORD_INVOICE'|'REPORT_PAYMENT'|'VERIFY_PAYMENT'|'REJECT_PAYMENT') {
    if (!selected) return
    setBusy(true); setError('')
    try {
      if (action === 'VERIFY_PAYMENT' && confirmation !==
        (qaSynthetic ? 'VERIFY QA SYNTHETIC NO REAL PAYMENT' : 'VERIFY PAID IN QBO'))
        throw new Error(t('salesNative.qboConfirmationError'))
      if (action === 'VERIFY_PAYMENT' && (!confirmedAt || Number.isNaN(Date.parse(confirmedAt))))
        throw new Error(t('salesNative.qboTimeError'))
      await request('patient-qbo', { method: 'POST', payload: {
        intentId: selected.id, action, qaSynthetic,
        ...(action === 'RECORD_INVOICE' ? {
          invoiceNumber, invoiceReference, customerReference, itemReference,
          hostedUrl: hostedUrl || undefined,
          invoiceAmountCents: selected.amount_cents,
        } : {}),
        ...(action === 'VERIFY_PAYMENT' ? {
          paymentReference, paymentConfirmedAt: new Date(confirmedAt).toISOString(), confirmation,
        } : {}),
      } })
      setConfirmation(''); setPaymentReference(''); setConfirmedAt('')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('salesNative.qboSaveError')) }
    finally { setBusy(false) }
  }
  async function activate() {
    if (!selected || activationConfirmation !== 'ACTIVATE VERIFIED MEMBERSHIP') return
    setBusy(true); setError('')
    try {
      await request('patient-qbo/activate', { method: 'POST', payload: {
        intentId: selected.id, phone, address, confirmation: activationConfirmation,
      } })
      setActivationConfirmation(''); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('salesNative.qboActivateError')) }
    finally { setBusy(false) }
  }
  async function recordVoid() {
    if (!selected || !selectionReview || voidConfirmation !== 'CONFIRM VOID IN QBO' ||
      !selected.qbo?.qbo_invoice_number || voidEvidence.trim().length < 8) return
    setBusy(true); setError('')
    try {
      await request('patient-qbo/void', { method: 'POST', payload: {
        intentId: selected.id, invoiceNumber: selected.qbo.qbo_invoice_number,
        evidence: voidEvidence.trim(), confirmation: voidConfirmation,
      } })
      setVoidEvidence(''); setVoidConfirmation(''); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('salesNative.qboSaveError')) }
    finally { setBusy(false) }
  }
  return <section className={s.panel} style={{ gridColumn: '1 / -1' }}>
    <h2>{t('salesNative.qboTitle')}</h2>
    <p className={s.caption}>{t('salesNative.qboNotice')}</p>
    <label className={s.form}>{t('salesNative.qboOpportunityPatient')}
      <select value={selectedId} onChange={event => {
        const row = rows.find(item => item.id === event.target.value)
        setSelectedId(event.target.value)
        setInvoiceNumber(row?.qbo?.qbo_invoice_number ?? '')
        setInvoiceReference(row?.qbo?.qbo_invoice_reference ?? '')
        setCustomerReference(row?.qbo?.qbo_customer_reference ?? '')
        setItemReference(row?.qbo?.qbo_item_reference ?? '')
        setHostedUrl(row?.qbo?.qbo_hosted_payment_url ?? '')
        setQaSynthetic(row?.qbo?.qa_synthetic ?? false)
        setConfirmation('')
      }}>
        <option value="">{t('salesNative.qboSelectOpportunity')}</option>
        {rows.map(row => <option key={row.id} value={row.id}>{row.contact_name} · {row.plan} · {row.opportunity_id.slice(0,8)}</option>)}
      </select>
    </label>
    {selected && <div className={s.form}>
      <p><strong>{selected.contact_name}</strong> · {selected.plan} · {selected.membership_type} · {selected.duration} · {amount}</p>
      <p>{t('salesNative.qboOpportunity')}: {selected.opportunity_id}</p>
      <p>{t('salesNative.qboFlow')}: {selected.qbo?.verification_state ?? 'PENDING_INVOICE'} · {t('salesNative.qboInvoice')}: {selected.qbo?.qbo_invoice_status ?? 'NOT_CREATED'} · {t('salesNative.qboPayment')}: {selected.qbo?.qbo_payment_status ?? 'UNPAID'}</p>
      <p>{t('salesNative.qboFinanceVerification')}: {selected.qbo?.finance_verification_status ?? 'PENDING'} · {t('salesNative.qboMembership')}: {selected.qbo?.membership_activation_status ?? 'NOT_ACTIVE'}</p>
      {selected.qbo?.qa_synthetic && <p><strong>{t('salesNative.qboSyntheticBadge')}</strong></p>}
      <p>{t('salesNative.qboInvoiceNumber')}: {selected.qbo?.qbo_invoice_number ?? t('salesNative.qboPending')}</p>
      <p>{t('salesNative.qboInvoiceReference')}: {selected.qbo?.qbo_invoice_reference ?? '—'} · {t('salesNative.qboCustomerReference')}: {selected.qbo?.qbo_customer_reference ?? '—'} · {t('salesNative.qboItemReference')}: {selected.qbo?.qbo_item_reference ?? '—'}</p>
      <p>{t('salesNative.qboVerifiedBy')}: {selected.qbo?.qbo_payment_verified_name ?? '—'} · {selected.qbo?.qbo_payment_verified_at ?? '—'}</p>
      {selected.qbo?.qbo_hosted_payment_url && !selectionReview && <a href={selected.qbo.qbo_hosted_payment_url} target="_blank" rel="noopener noreferrer">{t('salesNative.qboOpenHostedPayment')}</a>}
      {selected.qbo?.qbo_qr_reference && !selectionReview && <p>{t('salesNative.qboQrReference')}: {selected.qbo.qbo_qr_reference}</p>}
      {selectionReview && <p role="status">{t('salesNative.qboSelectionReview')}</p>}
      {canVerify && selectionReview && selected.qbo?.qbo_invoice_status === 'OPEN' && selected.qbo.qbo_payment_status === 'UNPAID' && <>
        <label>{t('salesNative.qboVoidEvidence')}<input value={voidEvidence} onChange={event => setVoidEvidence(event.target.value)} /></label>
        <label>{t('salesNative.qboVoidConfirmation')}<input value={voidConfirmation} onChange={event => setVoidConfirmation(event.target.value)} /></label>
        <button type="button" disabled={busy || voidConfirmation !== 'CONFIRM VOID IN QBO' || voidEvidence.trim().length < 8}
          onClick={() => void recordVoid()}>{t('salesNative.qboRecordVoid')}</button>
      </>}
      {canVerify && !selectionReview && selected.qbo?.verification_state !== 'PAYMENT_VERIFIED' && <>
        <label>{t('salesNative.qboInvoiceNumber')}<input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} /></label>
        <label>{t('salesNative.qboInvoiceReference')}<input value={invoiceReference} onChange={event => setInvoiceReference(event.target.value)} /></label>
        <label>{t('salesNative.qboCustomerOptional')}<input value={customerReference} onChange={event => setCustomerReference(event.target.value)} /></label>
        <label>{t('salesNative.qboItemOptional')}<input value={itemReference} onChange={event => setItemReference(event.target.value)} /></label>
        <label>{t('salesNative.qboHostedUrl')}<input type="url" value={hostedUrl} onChange={event => setHostedUrl(event.target.value)} /></label>
        <label><input type="checkbox" checked={qaSynthetic} disabled={!!selected.qbo}
          onChange={event => setQaSynthetic(event.target.checked)} /> {t('salesNative.qboSyntheticInput')}</label>
        <button type="button" disabled={busy || !invoiceNumber} onClick={() => void act('RECORD_INVOICE')}>{t('salesNative.qboRecordInvoice')}</button>
        <button type="button" disabled={busy || !selected.qbo?.qbo_invoice_number} onClick={() => void act('REPORT_PAYMENT')}>{t('salesNative.qboReportPayment')}</button>
        <label>{t('salesNative.qboPaymentReference')}<input value={paymentReference} onChange={event => setPaymentReference(event.target.value)} /></label>
        <label>{t('salesNative.qboPaymentTime')}<input type="datetime-local" value={confirmedAt}
          onChange={event => setConfirmedAt(event.target.value)} /></label>
        <label>{t('salesNative.qboConfirmation')}: {qaSynthetic ? 'VERIFY QA SYNTHETIC NO REAL PAYMENT' : 'VERIFY PAID IN QBO'}
          <input value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        <button type="button" disabled={busy || !selected.qbo?.qbo_invoice_number || !paymentReference || !confirmedAt}
          onClick={() => void act('VERIFY_PAYMENT')}>{t('salesNative.qboVerifyPayment')}</button>
        <button type="button" disabled={busy || !selected.qbo} onClick={() => void act('REJECT_PAYMENT')}>{t('salesNative.qboRejectPayment')}</button>
      </>}
      {canVerify && !selectionReview && selected.qbo?.verification_state === 'PAYMENT_VERIFIED' &&
        selected.qbo.membership_activation_status !== 'ACTIVE' && <>
        <p>{t('salesNative.qboActivationNotice')}</p>
        <label>{t('salesNative.qboConfirmedPhone')}<input value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label>{t('salesNative.qboConfirmedAddress')}<input value={address} onChange={event => setAddress(event.target.value)} /></label>
        <label>{t('salesNative.qboActivationConfirmation')}<input value={activationConfirmation}
          onChange={event => setActivationConfirmation(event.target.value)} /></label>
        <button type="button" disabled={busy || !phone || !address ||
          activationConfirmation !== 'ACTIVATE VERIFIED MEMBERSHIP'} onClick={() => void activate()}>
          {t('salesNative.qboActivateMembership')}
        </button>
      </>}
    </div>}
    {!rows.length && <p className={s.empty}>{t('salesNative.qboNoEnrollments')}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
