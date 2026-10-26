'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { allSalesPages } from './pagination'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Opportunity = { id: string; name: string; amount: string | number | null; currency: string;
  primary_contact_id?: string | null }
type Contact = { id: string; display_name: string; email?: string | null; phone?: string | null }
type Payment = { id: string; amount: string; currency: string; paid_at: string;
  reference?: string | null; used: boolean }
type Quote = { monthly_cents: number; total_cents: number; visit_fee_cents: number;
  included_visits: number; initial_months: number }
const today = () => new Date().toISOString().slice(0,10)

export default function NativeMembershipIssue({ request, role, onSaved }: {
  request: NativeRequest; role: string; onSaved: () => void
}) {
  const { t } = useT()
  const [opportunities,setOpportunities] = useState<Opportunity[]>([])
  const [opportunityQuery,setOpportunityQuery] = useState('')
  const [opportunityId,setOpportunityId] = useState('')
  const [contacts,setContacts] = useState<Contact[]>([])
  const [contactQuery,setContactQuery] = useState('')
  const [contactId,setContactId] = useState('')
  const [payments,setPayments] = useState<Payment[]>([])
  const [paymentId,setPaymentId] = useState('')
  const [plan,setPlan] = useState<'ESSENTIAL'|'PLUS'|'MAX'>('ESSENTIAL')
  const [membershipType,setMembershipType] = useState<'INDIVIDUAL'|'FAMILY'>('INDIVIDUAL')
  const [duration,setDuration] = useState<'MONTHLY'|'3M'|'6M'|'12M'>('MONTHLY')
  const [quote,setQuote] = useState<Quote | null>(null)
  const [issuedAt,setIssuedAt] = useState(today)
  const [firstName,setFirstName] = useState('')
  const [lastName,setLastName] = useState('')
  const [phone,setPhone] = useState('')
  const [email,setEmail] = useState('')
  const [address,setAddress] = useState('')
  const [isDemo,setIsDemo] = useState(false)
  const [paymentAmount,setPaymentAmount] = useState('')
  const [paymentReference,setPaymentReference] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [reloadPayments,setReloadPayments] = useState(0)
  const issueKey = useRef({payload:'',value:''})
  const evidenceKey = useRef({payload:'',value:''})
  const canConfirm = role==='SUPERADMIN' || role==='ADMINISTRATOR'

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({limit:'50'})
    if (opportunityQuery.trim()) params.set('q',opportunityQuery.trim())
    void allSalesPages<Opportunity>(request, `opportunities?${params}`, () => cancelled).then(result => {
      if (!cancelled) setOpportunities(result)
    }).catch(() => {if (!cancelled) setOpportunities([])})
    return () => {cancelled=true}
  },[opportunityQuery,request])
  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({limit:'50'})
    if (contactQuery.trim()) params.set('q',contactQuery.trim())
    void allSalesPages<Contact>(request, `contacts?${params}`, () => cancelled).then(result => {
      if (!cancelled) setContacts(result)
    }).catch(() => {if (!cancelled) setContacts([])})
    return () => {cancelled=true}
  },[contactQuery,request])
  useEffect(() => {
    if (!opportunityId) {setPayments([]);return}
    let cancelled = false
    void request(`opportunities/${opportunityId}/payments`).then(result => {
      if (!cancelled) setPayments(Array.isArray(result.data) ? result.data as Payment[] : [])
    }).catch(cause => {if (!cancelled) {setPayments([]);setError(cause instanceof Error ? cause.message : 'PAYMENTS_UNAVAILABLE')}})
    return () => {cancelled=true}
  },[opportunityId,reloadPayments,request])
  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({plan,type:membershipType,duration})
    void request(`memberships/quote?${params}`).then(result => {
      if (!cancelled) setQuote(result.data as Quote)
    }).catch(() => {if (!cancelled) setQuote(null)})
    return () => {cancelled=true}
  },[plan,membershipType,duration,request])

  const selectedContact = contacts.find(contact => contact.id===contactId)
  const selectedOpportunity = opportunities.find(item => item.id===opportunityId)
  const selectedPayment = payments.find(item => item.id===paymentId)
  const paymentMatchesQuote = Boolean(selectedPayment && quote &&
    Math.round(Number(selectedPayment.amount)*100)===quote.total_cents)
  const money = (cents: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)

  async function recordEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!opportunityId || !canConfirm) return
    const payload = {amount:paymentAmount.trim(),currency:'USD',paidAt:issuedAt,
      ...(paymentReference.trim() ? {reference:paymentReference.trim()} : {})}
    const serialized=JSON.stringify(payload)
    if (evidenceKey.current.payload!==serialized) evidenceKey.current={payload:serialized,value:crypto.randomUUID()}
    setBusy(true);setError('')
    try {
      const result=await request(`opportunities/${opportunityId}/payments`,{
        method:'POST',payload,idempotencyKey:evidenceKey.current.value})
      const row=result.data as Payment
      setPaymentId(row.id);setReloadPayments(value => value+1)
      setPaymentAmount('');setPaymentReference('');evidenceKey.current={payload:'',value:''}
    } catch(cause) {setError(cause instanceof Error ? cause.message : 'PAYMENT_EVIDENCE_FAILED')}
    finally {setBusy(false)}
  }

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!paymentId || !contactId || !quote) return
    const payload={paymentId,contactId,plan,membershipType,duration,issuedAt,
      firstName:firstName.trim(),lastName:lastName.trim(),phone:phone.trim(),
      email:email.trim(),address:address.trim(),isDemo}
    const serialized=JSON.stringify(payload)
    if (issueKey.current.payload!==serialized) issueKey.current={payload:serialized,value:crypto.randomUUID()}
    setBusy(true);setError('')
    try {
      await request('memberships',{method:'POST',payload,idempotencyKey:issueKey.current.value})
      onSaved()
    } catch(cause) {setError(cause instanceof Error ? cause.message : 'MEMBERSHIP_ISSUE_FAILED')}
    finally {setBusy(false)}
  }

  return <section className={`${s.panel} ${s.form}`} aria-label={t('salesNative.issueMembership')}>
    <h2>{t('salesNative.issueMembership')}</h2>
    <p>{t('salesNative.requiresPreviouslyVerifiedPaymentEvidenceThisScreenDoes')}</p>
    <div className={s.formGrid}>
      <label>{t('salesNative.auditFindOpportunity')} <input value={opportunityQuery} onChange={event => {setOpportunityQuery(event.target.value);setOpportunityId('');setPaymentId('')}} placeholder={t('salesNative.searchByName')} /></label>
      <label>{t('salesNative.qboOpportunity')} <select required value={opportunityId} onChange={event => {setOpportunityId(event.target.value);setPaymentId('')}}>
        <option value="">{t('salesNative.chooseAnOpportunity')}</option>{opportunities.map(item =>
          <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>{t('salesNative.auditFindContact')} <input value={contactQuery} onChange={event => {setContactQuery(event.target.value);setContactId('')}} placeholder={t('salesNative.searchByName')} /></label>
      <label>{t('salesNative.auditPrimaryContact')} <select required value={contactId} onChange={event => {
        const id=event.target.value;setContactId(id)
        const contact=contacts.find(item => item.id===id)
        if (contact) {const parts=contact.display_name.trim().split(/\s+/);setFirstName(parts.shift() || '');setLastName(parts.join(' '));
          setPhone(contact.phone || '');setEmail(contact.email || '')}
      }}><option value="">{t('salesNative.chooseAContact')}</option>{contacts.map(item =>
        <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
      <label>{t('salesNative.auditPlan')} <select value={plan} onChange={event => setPlan(event.target.value as typeof plan)}><option value="ESSENTIAL">{t('salesNative.essential')}</option><option value="PLUS">PLUS</option><option value="MAX">MAX</option></select></label>
      <label>{t('salesNative.auditType')} <select value={membershipType} onChange={event => setMembershipType(event.target.value as typeof membershipType)}><option value="INDIVIDUAL">{t('salesNative.individual')}</option><option value="FAMILY">{t('salesNative.auditFamily')}</option></select></label>
      <label>{t('salesNative.auditDuration')} <select value={duration} onChange={event => setDuration(event.target.value as typeof duration)}>
        <option value="MONTHLY">{t('salesNative.monthToMonthTwoMonthsPaidUpFront')}</option><option value="3M">{t('salesNative.renewalThreeMonths')}</option><option value="6M">{t('salesNative.renewalSixMonths')}</option><option value="12M">{t('salesNative.renewalTwelveMonths')}</option>
      </select></label>
      <label>{t('salesNative.auditIssueDate')} <input type="date" required value={issuedAt} onChange={event => setIssuedAt(event.target.value)} /></label>
    </div>
    {quote && <p className={s.caption}>Initial term: {quote.initial_months} months · Total: {money(quote.total_cents)} · Monthly rate: {money(quote.monthly_cents)} · Included visits: {quote.included_visits}</p>}
    {selectedOpportunity && <p className={s.caption}>Opportunity amount: {selectedOpportunity.currency} {selectedOpportunity.amount ?? '—'}</p>}
    {selectedContact && <p className={s.caption}>Selected primary member: {selectedContact.display_name}</p>}
    {canConfirm && opportunityId && <form className={s.form} onSubmit={event => void recordEvidence(event)}>
      <h3>{t('salesNative.recordVerifiedPaymentEvidence')}</h3><p>{t('salesNative.auditStaffAttestationOnlyNoProcessorOrBankTransactionIsInitiated')}</p>
      <div className={s.formGrid}>
        <label>{t('salesNative.auditVerifiedAmountUsd')} <input type="number" min="0.01" step="0.01" required value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} /></label>
        <label>{t('salesNative.auditReference')} <input maxLength={200} value={paymentReference} onChange={event => setPaymentReference(event.target.value)} /></label>
      </div><button type="submit" disabled={busy || !paymentAmount}>{t('salesNative.recordEvidence')}</button>
    </form>}
    <form className={s.form} onSubmit={event => void issue(event)}>
      <div className={s.formGrid}>
        <label>{t('salesNative.auditPaymentEvidence')} <select required value={paymentId} onChange={event => setPaymentId(event.target.value)}>
          <option value="">{t('salesNative.chooseUnusedEvidence')}</option>{payments.filter(item => !item.used).map(item =>
            <option key={item.id} value={item.id}>{item.currency} {item.amount} · {item.paid_at} · {item.reference || 'No reference'}</option>)}</select></label>
        <label>{t('salesNative.auditFirstName')} <input required maxLength={160} value={firstName} onChange={event => setFirstName(event.target.value)} /></label>
        <label>{t('salesNative.auditLastName')} <input required maxLength={160} value={lastName} onChange={event => setLastName(event.target.value)} /></label>
        <label>{t('salesNative.auditPhone')} <input required maxLength={80} value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label>{t('salesNative.email')} <input required type="email" maxLength={320} value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>{t('salesNative.auditAddress')} <input required maxLength={1000} value={address} onChange={event => setAddress(event.target.value)} /></label>
      </div>
      {role==='SUPERADMIN' && <label className={s.checkbox}><input type="checkbox" checked={isDemo} onChange={event => setIsDemo(event.target.checked)} />{t('salesNative.demoQaRecord')}</label>}
      {selectedPayment && quote && !paymentMatchesQuote &&
        <p role="alert" className={s.error}>{t('salesNative.evidenceAmountDoesNotMatchTheMembershipQuote')}</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      <button type="submit" disabled={busy || !contactId || !paymentMatchesQuote}>{busy ? 'Saving…' : 'Issue paid membership'}</button>
    </form>
  </section>
}
