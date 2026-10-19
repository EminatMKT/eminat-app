'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import s from './SalesModule.module.css'

type Catalog = { plans: string[]; modalities: string[]; durations: string[];
  quotes: { plan: string; modality: string; duration: string; totalCents: number }[] }
type Contact = { id: string; displayName: string; firstName?: string | null;
  lastName?: string | null; phone?: string | null; email?: string | null }
type Opportunity = { id: string; name: string; stageId: string; primaryContactId?: string | null }
type Payment = { id: string; amount: string; currency: string; paidAt: string;
  reference?: string | null; availableForMembership: boolean }
type Stage = { id: string; outcome?: string }
type Member = { contactId: string; firstName: string; lastName: string;
  phoneCountryCode: string; phone: string; email: string; address: string }
const emptyMember = (): Member => ({ contactId: '', firstName: '', lastName: '',
  phoneCountryCode: '+', phone: '', email: '', address: '' })

async function annie(path: string, method = 'GET', body?: object) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session required')
  const response = await fetch(`/api/integrations/annie/sales/${path}`, {
    method, cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json().catch(() => { throw new Error('ANNIE_INVALID_RESPONSE') }) as
    { data?: unknown; code?: string }
  if (!response.ok) throw new Error(result.code ?? 'ANNIE_REQUEST_FAILED')
  return result
}

export default function MembershipQaCreate({ catalog, onCreated, paid = false }: {
  catalog: Catalog; onCreated: (id: string) => void; paid?: boolean
}) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([])
  const [salesPaymentId, setSalesPaymentId] = useState('')
  const [opportunityId, setOpportunityId] = useState('')
  const [plan, setPlan] = useState(catalog.plans[0] ?? '')
  const [modality, setModality] = useState(catalog.modalities[0] ?? '')
  const [duration, setDuration] = useState(catalog.durations[0] ?? '')
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10))
  const [members, setMembers] = useState<Member[]>([emptyMember()])
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const quote = catalog.quotes.find(item => item.plan === plan && item.modality === modality && item.duration === duration)
  const eligiblePayments = payments.filter(payment => payment.availableForMembership &&
    payment.currency === 'USD' && quote && Math.round(Number(payment.amount) * 100) === quote.totalCents)
  const availableContacts = paid ? linkedContacts : contacts
  useEffect(() => {
    let cancelled = false
    void Promise.all([
      paid ? Promise.resolve({ data: [] }) : annie('contacts?limit=100'),
      annie('opportunities?limit=100'), annie('pipeline'),
    ]).then(([contactResult, opportunityResult, pipelineResult]) => {
      if (cancelled) return
      const stageIds = new Set(((pipelineResult.data as { stages?: Stage[] } | undefined)?.stages ?? [])
        .filter(stage => stage.outcome === 'won').map(stage => stage.id))
      setContacts(((contactResult.data as Contact[] | undefined) ?? []).filter(contact =>
        paid || contact.displayName?.startsWith('QA PHASE C ')))
      setOpportunities(((opportunityResult.data as Opportunity[] | undefined) ?? []).filter(opportunity =>
        (paid || opportunity.name?.startsWith('QA PHASE C ')) && stageIds.has(opportunity.stageId)))
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'QA_RECORDS_UNAVAILABLE') })
    return () => { cancelled = true }
  }, [paid])
  useEffect(() => {
    setSalesPaymentId(''); setPayments([]); setLinkedContacts([])
    if (!paid || !opportunityId) return
    let cancelled = false
    void Promise.all([
      annie(`extended/opportunities/${opportunityId}/payments`),
      annie(`opportunities/${opportunityId}`),
      annie(`opportunities/${opportunityId}/contacts`),
    ]).then(async ([paymentResult, opportunityResult, linksResult]) => {
      const primaryId = (opportunityResult.data as Opportunity | undefined)?.primaryContactId
      const primaryResult = primaryId ? await annie(`contacts/${primaryId}`) : null
      const related = ((linksResult.data as { contact?: Contact }[] | undefined) ?? [])
        .map(link => link.contact).filter((contact): contact is Contact => !!contact)
      const mapped = new Map<string, Contact>()
      for (const contact of [...related, ...(primaryResult?.data ? [primaryResult.data as Contact] : [])])
        mapped.set(contact.id, contact)
      if (!cancelled) {
        setPayments((paymentResult.data as Payment[] | undefined) ?? [])
        setLinkedContacts(Array.from(mapped.values()))
      }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'PAYMENTS_UNAVAILABLE') })
    return () => { cancelled = true }
  }, [paid, opportunityId])
  function update(index: number, field: keyof Member, value: string) {
    setMembers(current => current.map((member, i) => i === index ? { ...member, [field]: value } : member))
  }
  function choose(index: number, id: string) {
    const contact = availableContacts.find(row => row.id === id)
    setMembers(current => current.map((member, i) => i === index ? {
      ...member, contactId: id, firstName: contact?.firstName ?? '',
      lastName: contact?.lastName ?? '', phone: contact?.phone ?? '',
      email: contact?.email ?? '',
    } : member))
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || uncertain) return
    setBusy(true); setError('')
    try {
      const selectedPayment = eligiblePayments.find(payment => payment.id === salesPaymentId)
      if (paid && !selectedPayment)
        throw new Error('RECORDED_PAYMENT_REQUIRED')
      const result = await annie(paid ? 'memberships' : 'membership-qa', 'POST', {
        plan, modality, duration, opportunityId, issuedAt,
        saleDate: paid ? selectedPayment!.paidAt.slice(0, 10) : issuedAt,
        ...(paid ? { salesPaymentId } : {}), members })
      const id = (result.data as { id?: string } | undefined)?.id
      if (!id) throw new Error('ANNIE_INVALID_RESPONSE')
      onCreated(id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'ANNIE_REQUEST_FAILED'
      setError(message)
      if (/ANNIE_UNAVAILABLE|ANNIE_INVALID_RESPONSE|ANNIE_UPSTREAM_ERROR/.test(message)) setUncertain(true)
    } finally { setBusy(false) }
  }
  return <div className={s.card}><h2>{paid ? 'Issue membership from recorded payment' : 'Controlled demo membership'}</h2>
    <p className={s.muted}>{paid
      ? 'Select an existing ANNIE payment. ANNIE confirms the amount, date and one-primary allocation before issuing the membership. This does not collect money.'
      : 'SUPERADMIN QA only. ANNIE creates demo records and PDFs; no real payment or member email is sent.'}</p>
    <form onSubmit={event => void submit(event)}>
      <div className={s.filters}>
        <label>{paid ? 'Won Opportunity' : 'Won synthetic Opportunity'} <select required value={opportunityId} onChange={event => { setOpportunityId(event.target.value); setMembers([emptyMember()]); setError('') }}><option value="">Select…</option>{opportunities.map(opportunity => <option key={opportunity.id} value={opportunity.id}>{opportunity.name}</option>)}</select></label>
        {paid && <label>Recorded payment matching ANNIE quote <select required value={salesPaymentId} onChange={event => setSalesPaymentId(event.target.value)}><option value="">Select…</option>{eligiblePayments.map(payment => <option key={payment.id} value={payment.id}>{payment.currency} {payment.amount} · {payment.paidAt.slice(0, 10)} · {payment.reference || 'Recorded payment'}</option>)}</select></label>}
        <label>Plan <select value={plan} onChange={event => setPlan(event.target.value)}>{catalog.plans.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Type <select value={modality} onChange={event => { setModality(event.target.value); if (event.target.value === 'INDIVIDUAL') setMembers(current => current.slice(0, 1)) }}><option value="INDIVIDUAL">Individual</option><option value="FAMILY">Family</option></select></label>
        <label>Term <select value={duration} onChange={event => setDuration(event.target.value)}>{catalog.durations.map(value => <option key={value} value={value}>{value === 'MONTHLY' ? 'Month to month' : `${value.slice(0, -1)} months`}</option>)}</select></label>
        <label>{paid ? 'Membership start date' : 'Start and sale date'} <input type="date" required value={issuedAt} onChange={event => setIssuedAt(event.target.value)} /></label>
      </div>
      {paid && opportunityId && eligiblePayments.length === 0 &&
        <p className={s.muted}>No unused recorded payment matches this ANNIE quote. Confirm the payment and membership plan in ANNIE.</p>}
      {members.map((member, index) => <fieldset key={index}><legend>{index === 0 ? 'Primary member' : `Family member ${index + 1}`}</legend>
        <div className={s.filters}>
          <label>{paid ? 'Opportunity Contact' : 'ANNIE synthetic Contact'} <select required value={member.contactId} onChange={event => choose(index, event.target.value)}><option value="">Select…</option>{availableContacts.filter(contact => !members.some((other, i) => i !== index && other.contactId === contact.id)).map(contact => <option key={contact.id} value={contact.id}>{contact.displayName}</option>)}</select></label>
          {(['firstName', 'lastName', 'phoneCountryCode', 'phone', 'email', 'address'] as const).map(field =>
            <label key={field}>{({ firstName: 'First name', lastName: 'Last name', phoneCountryCode: 'Phone country code', phone: 'Phone', email: 'Email', address: 'Address' })[field]}
              <input required type={field === 'email' ? 'email' : 'text'} value={member[field]} onChange={event => update(index, field, event.target.value)} /></label>)}
        </div>{index > 0 && <button type="button" onClick={() => setMembers(current => current.filter((_, i) => i !== index))}>Remove member</button>}
      </fieldset>)}
      {modality === 'FAMILY' && members.length < 3 && <button type="button" onClick={() => setMembers(current => [...current, emptyMember()])}>Add family member</button>}
      <button type="submit" disabled={busy || uncertain || !opportunityId || (paid && !eligiblePayments.some(payment => payment.id === salesPaymentId)) || !members.every(member => member.contactId)}>{paid ? 'Issue membership in ANNIE' : 'Create demo membership in ANNIE'}</button>
    </form>
    {error && <p role="alert" className={s.error}>{error}{uncertain ? ' Check ANNIE before retrying; the outcome may be uncertain.' : ''}</p>}
  </div>
}
