'use client'
import { useCallback, useEffect, useState } from 'react'
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const result = await request('patient-qbo')
    setRows(Array.isArray(result.data) ? result.data as Enrollment[] : [])
    setCanVerify(result.canVerify === true)
  }, [request])
  useEffect(() => { void load().catch(() => setError('No se pudo consultar el seguimiento QBO.')) }, [load])
  const selected = rows.find(row => row.id === selectedId)
  const amount = selected ? (selected.amount_cents / 100).toLocaleString('en-US',
    { style: 'currency', currency: 'USD' }) : ''
  async function act(action: 'RECORD_INVOICE'|'REPORT_PAYMENT'|'VERIFY_PAYMENT'|'REJECT_PAYMENT') {
    if (!selected) return
    setBusy(true); setError('')
    try {
      if (action === 'VERIFY_PAYMENT' && confirmation !==
        (qaSynthetic ? 'VERIFY QA SYNTHETIC NO REAL PAYMENT' : 'VERIFY PAID IN QBO'))
        throw new Error('Escribe la confirmación exacta antes de verificar.')
      if (action === 'VERIFY_PAYMENT' && (!confirmedAt || Number.isNaN(Date.parse(confirmedAt))))
        throw new Error('Indica la hora de confirmación observada en QuickBooks.')
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.') }
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo activar.') }
    finally { setBusy(false) }
  }
  return <section className={s.panel} style={{ gridColumn: '1 / -1' }}>
    <h2>Patient Portal · QuickBooks manual</h2>
    <p className={s.caption}>El plan queda pendiente hasta que Finance confirme el pago en QuickBooks. Los registros QA no representan dinero real.</p>
    <label className={s.form}>Oportunidad / paciente
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
        <option value="">Selecciona una oportunidad</option>
        {rows.map(row => <option key={row.id} value={row.id}>{row.contact_name} · {row.plan} · {row.opportunity_id.slice(0,8)}</option>)}
      </select>
    </label>
    {selected && <div className={s.form}>
      <p><strong>{selected.contact_name}</strong> · {selected.plan} · {selected.membership_type} · {selected.duration} · {amount}</p>
      <p>Oportunidad: {selected.opportunity_id}</p>
      <p>Flujo: {selected.qbo?.verification_state ?? 'PENDING_INVOICE'} · Factura: {selected.qbo?.qbo_invoice_status ?? 'NOT_CREATED'} · Pago: {selected.qbo?.qbo_payment_status ?? 'UNPAID'}</p>
      <p>Verificación Finance: {selected.qbo?.finance_verification_status ?? 'PENDING'} · Membresía: {selected.qbo?.membership_activation_status ?? 'NOT_ACTIVE'}</p>
      {selected.qbo?.qa_synthetic && <p><strong>QA / SYNTHETIC / NO REAL PAYMENT</strong></p>}
      <p>N.º factura: {selected.qbo?.qbo_invoice_number ?? 'Pendiente'}</p>
      <p>Referencia factura: {selected.qbo?.qbo_invoice_reference ?? '—'} · Cliente QBO: {selected.qbo?.qbo_customer_reference ?? '—'} · Ítem QBO: {selected.qbo?.qbo_item_reference ?? '—'}</p>
      <p>Verificó: {selected.qbo?.qbo_payment_verified_name ?? '—'} · {selected.qbo?.qbo_payment_verified_at ?? '—'}</p>
      {selected.qbo?.qbo_hosted_payment_url && <a href={selected.qbo.qbo_hosted_payment_url} target="_blank" rel="noopener noreferrer">Abrir pago alojado en QuickBooks</a>}
      {selected.qbo?.qbo_qr_reference && <p>QR de QuickBooks: {selected.qbo.qbo_qr_reference}</p>}
      {canVerify && selected.qbo?.verification_state !== 'PAYMENT_VERIFIED' && <>
        <label>N.º factura QBO<input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} /></label>
        <label>Referencia factura QBO<input value={invoiceReference} onChange={event => setInvoiceReference(event.target.value)} /></label>
        <label>Referencia cliente QBO, si existe<input value={customerReference} onChange={event => setCustomerReference(event.target.value)} /></label>
        <label>Referencia ítem QBO, si existe<input value={itemReference} onChange={event => setItemReference(event.target.value)} /></label>
        <label>Enlace de pago QBO<input type="url" value={hostedUrl} onChange={event => setHostedUrl(event.target.value)} /></label>
        <label><input type="checkbox" checked={qaSynthetic} disabled={!!selected.qbo}
          onChange={event => setQaSynthetic(event.target.checked)} /> Registro sintético QA (sin pago real)</label>
        <button type="button" disabled={busy || !invoiceNumber} onClick={() => void act('RECORD_INVOICE')}>Registrar factura</button>
        <button type="button" disabled={busy || !selected.qbo?.qbo_invoice_number} onClick={() => void act('REPORT_PAYMENT')}>Marcar pago reportado</button>
        <label>Referencia de pago comprobada en QBO<input value={paymentReference} onChange={event => setPaymentReference(event.target.value)} /></label>
        <label>Fecha y hora de pago comprobada en QBO<input type="datetime-local" value={confirmedAt}
          onChange={event => setConfirmedAt(event.target.value)} /></label>
        <label>Confirmación: {qaSynthetic ? 'VERIFY QA SYNTHETIC NO REAL PAYMENT' : 'VERIFY PAID IN QBO'}
          <input value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        <button type="button" disabled={busy || !selected.qbo?.qbo_invoice_number || !paymentReference || !confirmedAt}
          onClick={() => void act('VERIFY_PAYMENT')}>Verify Payment</button>
        <button type="button" disabled={busy || !selected.qbo} onClick={() => void act('REJECT_PAYMENT')}>Rechazar pago</button>
      </>}
      {canVerify && selected.qbo?.verification_state === 'PAYMENT_VERIFIED' &&
        selected.qbo.membership_activation_status !== 'ACTIVE' && <>
        <p>Activar únicamente después de verificar el pago. Se requieren teléfono y dirección confirmados del paciente.</p>
        <label>Teléfono confirmado<input value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label>Dirección confirmada<input value={address} onChange={event => setAddress(event.target.value)} /></label>
        <label>Escribe ACTIVATE VERIFIED MEMBERSHIP<input value={activationConfirmation}
          onChange={event => setActivationConfirmation(event.target.value)} /></label>
        <button type="button" disabled={busy || !phone || !address ||
          activationConfirmation !== 'ACTIVATE VERIFIED MEMBERSHIP'} onClick={() => void activate()}>
          Activar membresía verificada
        </button>
      </>}
    </div>}
    {!rows.length && <p className={s.empty}>No hay inscripciones visibles.</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
