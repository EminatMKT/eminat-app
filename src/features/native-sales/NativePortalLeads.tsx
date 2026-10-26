'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import { salesDisplayValue } from './display-value'
import s from './NativeSalesModule.module.css'

type PortalLead = {
  id: string; displayName: string; email: string | null; phone: string | null
  registeredAt: string; profileComplete: boolean; source: string
  ownerMemberId: string | null; assignmentStatus: string; assignmentAt: string | null
  assignedSellerName: string | null
  assignmentSource: string; leadStatus: string; plan: string | null
  membershipType: string | null; modality: string | null; amountCents: number | null
  intentStatus: string | null; opportunityId: string | null; opportunityStage: string | null
  invoiceNumber: string | null; invoiceStatus: string; paymentStatus: string
  membershipStatus: string; commercialStatus: string; familyCount: number | null
  followUpRequired: boolean; nextAction: string | null; nextFollowUpAt: string | null
  lastActivityAt: string | null; lastActivity: string | null
}
type Filters = { q: string; owner: string; assignment: string; plan: string; type: string; stage: string;
  invoice: string; payment: string; membership: string; followUp: string;
  from: string; to: string }
const initial: Filters = { q:'',owner:'',assignment:'',plan:'',type:'',stage:'',invoice:'',payment:'',
  membership:'',followUp:'',from:'',to:'' }
const date = (value: string | null) => value ? new Date(value).toLocaleDateString() : '—'
const value = (input: string | null) => input || '—'

export default function NativePortalLeads({ request, users, onOpenLead }: {
  request: NativeRequest
  users: { memberId: string; displayName: string }[]
  onOpenLead: (email: string) => void
}) {
  const { t } = useT()
  const [filters, setFilters] = useState<Filters>(initial)
  const [offset, setOffset] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [rows, setRows] = useState<PortalLead[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [selected, setSelected] = useState<PortalLead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ limit:'25',offset:String(offset) })
    for (const [key, entry] of Object.entries(filters)) if (entry) params.set(key, entry)
    setLoading(true); setError('')
    void request(`portal-leads?${params}`).then(response => {
      if (cancelled) return
      setRows(Array.isArray(response.data) ? response.data as PortalLead[] : [])
      setNextOffset(typeof response.nextOffset === 'number' ? response.nextOffset : null)
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Sales unavailable') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request, filters, offset, refresh])
  const change = (key: keyof Filters, entry: string) => {
    setFilters(current => ({ ...current, [key]: entry })); setOffset(0); setSelected(null)
  }
  const userName = (row: PortalLead) => row.assignmentStatus === 'NEEDS_ASSIGNMENT'
    ? t('salesNative.auditUnassigned')
    : row.assignedSellerName || users.find(user => user.memberId === row.ownerMemberId)?.displayName || t('salesNative.auditAssignedSeller')
  return <>
    <section className={s.panel}>
      <h2>{t('salesNative.auditPatientPortalLeads')}</h2>
      <p>{t('salesNative.auditRegistrationsEnrollmentInvoiceStateAndFollowUpInOneSalesView')}</p>
      <div className={s.filters}>
        <label>{t('salesNative.auditSearch')} <input value={filters.q} onChange={event => change('q',event.target.value)} /></label>
        <label>{t('salesNative.auditSeller')} <select value={filters.owner} onChange={event => change('owner',event.target.value)}>
          <option value="">{t('salesNative.auditAllSellers')}</option>{users.map(user => <option key={user.memberId} value={user.memberId}>{user.displayName}</option>)}
        </select></label>
        <label>{t('salesNative.auditAssignment')} <select value={filters.assignment} onChange={event => change('assignment',event.target.value)}>
          <option value="">{t('salesNative.all')}</option><option value="ASSIGNED">{t('salesNative.auditAssigned')}</option>
          <option value="NEEDS_ASSIGNMENT">{t('salesNative.auditNeedsAssignment')}</option>
        </select></label>
        <label>{t('salesNative.auditPlan')} <select value={filters.plan} onChange={event => change('plan',event.target.value)}>
          <option value="">{t('salesNative.auditAllPlans')}</option>{['ESSENTIAL','PLUS','MAX'].map(plan => <option key={plan}>{plan}</option>)}
        </select></label>
        <label>{t('salesNative.auditType')} <select value={filters.type} onChange={event => change('type',event.target.value)}>
          <option value="">{t('salesNative.auditAllTypes')}</option><option value="INDIVIDUAL">{t('salesNative.auditIndividual')}</option><option value="FAMILY">{t('salesNative.auditFamily')}</option>
        </select></label>
        <label>{t('salesNative.qboOpportunity')} <select value={filters.stage} onChange={event => change('stage',event.target.value)}>
          <option value="">{t('salesNative.auditAllStages')}</option><option value="PAYMENT_PENDING">{t('salesNative.auditPaymentPending')}</option><option value="WON">{t('salesNative.auditWon')}</option><option value="LOST">{t('salesNative.auditLost')}</option>
        </select></label>
        <label>{t('salesNative.qboInvoice')} <select value={filters.invoice} onChange={event => change('invoice',event.target.value)}>
          <option value="">{t('salesNative.auditAllInvoiceStates')}</option><option value="NOT_CREATED">{t('salesNative.auditNotCreated')}</option><option value="OPEN">{t('salesNative.auditOpen')}</option><option value="PAID">{t('salesNative.auditPaid')}</option><option value="VOID">{t('salesNative.auditVoid')}</option>
        </select></label>
        <label>{t('salesNative.qboPayment')} <select value={filters.payment} onChange={event => change('payment',event.target.value)}>
          <option value="">{t('salesNative.auditAllPaymentStates')}</option><option value="UNPAID">{t('salesNative.auditUnpaid')}</option><option value="REPORTED">{t('salesNative.auditReported')}</option><option value="PAID">{t('salesNative.auditPaid')}</option><option value="VERIFIED">{t('salesNative.auditVerified')}</option><option value="REJECTED">{t('salesNative.auditRejected')}</option>
        </select></label>
        <label>{t('salesNative.qboMembership')} <select value={filters.membership} onChange={event => change('membership',event.target.value)}>
          <option value="">{t('salesNative.auditAllMemberships')}</option><option value="NOT_ACTIVE">{t('salesNative.auditNotActive')}</option><option value="ACTIVE">{t('salesNative.auditActive')}</option><option value="PENDING">{t('salesNative.auditPending')}</option><option value="EXPIRED">{t('salesNative.auditExpired')}</option><option value="CANCELLED">{t('salesNative.auditCancelled')}</option>
        </select></label>
        <label>{t('salesNative.auditFollowUp')} <select value={filters.followUp} onChange={event => change('followUp',event.target.value)}>
          <option value="">{t('salesNative.all')}</option><option value="true">{t('salesNative.auditRequired')}</option><option value="false">{t('salesNative.auditNotRequired')}</option>
        </select></label>
        <label>{t('salesNative.auditRegisteredFrom')} <input type="date" value={filters.from} onChange={event => change('from',event.target.value)} /></label>
        <label>{t('salesNative.auditRegisteredTo')} <input type="date" value={filters.to} onChange={event => change('to',event.target.value)} /></label>
      </div>
      <button type="button" onClick={() => setRefresh(count => count+1)}>{t('salesNative.refresh')}</button>
    </section>
    {loading && <p role="status">{t('salesNative.auditLoadingPortalLeads')}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && !error && <>
      {rows.length ? <div className={s.list}>{rows.map(row =>
        <button key={row.id} type="button" className={s.item} onClick={() => setSelected(row)}>
          <span><strong>{row.displayName}</strong><small>{row.email || t('salesNative.auditNoEmail')} · {salesDisplayValue(row.commercialStatus,t)}</small></span>
          <span className={s.meta}>{userName(row)} · {date(row.registeredAt)}</span>
        </button>)}</div> : <p className={s.empty}>{t('salesNative.auditNoPortalLeadsMatchTheseFilters')}</p>}
      <div className={s.pager}>
        <button type="button" disabled={offset===0} onClick={() => setOffset(Math.max(0,offset-25))}>{t('salesNative.previous')}</button>
        <span>{t('salesNative.auditPage')} {Math.floor(offset/25)+1}</span>
        <button type="button" disabled={nextOffset===null} onClick={() => setOffset(nextOffset ?? offset)}>{t('salesNative.next')}</button>
      </div>
    </>}
    {selected && <div className={s.overlay} role="presentation" onMouseDown={event => {
      if (event.target===event.currentTarget) setSelected(null)
    }}><section className={s.detail} role="dialog" aria-modal="true" aria-label={selected.displayName}>
      <div className={s.detailHeader}><h2>{selected.displayName}</h2>
        <button type="button" onClick={() => setSelected(null)} aria-label={t('salesNative.closeDetails')}>×</button></div>
      <dl>
        <dt>{t('salesNative.auditSourceRegistered')}</dt><dd>{salesDisplayValue(selected.source,t)} · {date(selected.registeredAt)}</dd>
        <dt>{t('salesNative.auditContact')}</dt><dd>{value(selected.email)} · {value(selected.phone)}</dd>
        <dt>{t('salesNative.auditProfile')}</dt><dd>{selected.profileComplete ? t('salesNative.complete') : t('salesNative.auditIncomplete')}</dd>
        <dt>{t('salesNative.auditSellerAssignment')}</dt><dd>{userName(selected)} · {salesDisplayValue(selected.assignmentStatus,t)} · {date(selected.assignmentAt)}</dd>
        <dt>{t('salesNative.auditRule')}</dt><dd>{salesDisplayValue(selected.assignmentSource,t)}</dd>
        <dt>{t('salesNative.auditLeadCommercial')}</dt><dd>{salesDisplayValue(selected.leadStatus,t)} · {salesDisplayValue(selected.commercialStatus,t)}</dd>
        <dt>{t('salesNative.auditSelection')}</dt><dd>{salesDisplayValue(value(selected.plan),t)} · {salesDisplayValue(value(selected.membershipType),t)} · {salesDisplayValue(value(selected.modality),t)}</dd>
        <dt>{t('salesNative.auditAmount')}</dt><dd>{selected.amountCents===null ? '—' : `$${(selected.amountCents/100).toFixed(2)}`}</dd>
        <dt>{t('salesNative.qboOpportunity')}</dt><dd>{salesDisplayValue(value(selected.opportunityStage),t)} · {value(selected.opportunityId)}</dd>
        <dt>{t('salesNative.qboInvoice')}</dt><dd>{salesDisplayValue(selected.invoiceStatus,t)} · {value(selected.invoiceNumber)}</dd>
        <dt>{t('salesNative.auditPaymentMembership')}</dt><dd>{salesDisplayValue(selected.paymentStatus,t)} · {salesDisplayValue(selected.membershipStatus,t)}</dd>
        <dt>{t('salesNative.auditFamilyCapacity')}</dt><dd>{selected.familyCount===null ? t('salesNative.individual') : `${selected.familyCount}/3`}</dd>
        <dt>{t('salesNative.auditNextAction')}</dt><dd>{salesDisplayValue(value(selected.nextAction),t)}</dd>
        <dt>{t('salesNative.auditFollowUpDue')}</dt><dd>{date(selected.nextFollowUpAt)}{selected.nextFollowUpAt && new Date(selected.nextFollowUpAt)<new Date() ? ` · ${t('salesNative.auditOverdue')}` : ''}</dd>
        <dt>{t('salesNative.auditLastActivity')}</dt><dd>{salesDisplayValue(value(selected.lastActivity),t)} · {date(selected.lastActivityAt)}</dd>
      </dl>
      {selected.email && <button type="button" onClick={() => onOpenLead(selected.email as string)}>{t('salesNative.auditOpenLeadAndActivities')}</button>}
    </section></div>}
  </>
}
