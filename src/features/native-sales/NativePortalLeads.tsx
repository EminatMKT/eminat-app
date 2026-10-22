'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type PortalLead = {
  id: string; displayName: string; email: string | null; phone: string | null
  registeredAt: string; profileComplete: boolean; source: string
  ownerMemberId: string | null; assignmentStatus: string; assignmentAt: string | null
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
  const userName = (id: string | null) => id
    ? users.find(user => user.memberId === id)?.displayName || 'Assigned seller'
    : 'Needs assignment'
  return <>
    <section className={s.panel}>
      <h2>Patient Portal leads</h2>
      <p>Registrations, enrollment, invoice state and follow-up in one Sales view.</p>
      <div className={s.filters}>
        <label>Search <input value={filters.q} onChange={event => change('q',event.target.value)} /></label>
        <label>Seller <select value={filters.owner} onChange={event => change('owner',event.target.value)}>
          <option value="">All sellers</option>{users.map(user => <option key={user.memberId} value={user.memberId}>{user.displayName}</option>)}
        </select></label>
        <label>Assignment <select value={filters.assignment} onChange={event => change('assignment',event.target.value)}>
          <option value="">All</option><option value="ASSIGNED">Assigned</option>
          <option value="NEEDS_ASSIGNMENT">Needs assignment</option>
        </select></label>
        <label>Plan <select value={filters.plan} onChange={event => change('plan',event.target.value)}>
          <option value="">All plans</option>{['ESSENTIAL','PLUS','MAX'].map(plan => <option key={plan}>{plan}</option>)}
        </select></label>
        <label>Type <select value={filters.type} onChange={event => change('type',event.target.value)}>
          <option value="">All types</option><option>INDIVIDUAL</option><option>FAMILY</option>
        </select></label>
        <label>Opportunity <select value={filters.stage} onChange={event => change('stage',event.target.value)}>
          <option value="">All stages</option><option>PAYMENT_PENDING</option><option>WON</option><option>LOST</option>
        </select></label>
        <label>Invoice <select value={filters.invoice} onChange={event => change('invoice',event.target.value)}>
          <option value="">All invoice states</option><option>NOT_CREATED</option><option>OPEN</option><option>PAID</option><option>VOID</option>
        </select></label>
        <label>Payment <select value={filters.payment} onChange={event => change('payment',event.target.value)}>
          <option value="">All payment states</option><option>UNPAID</option><option>REPORTED</option><option>PAID</option><option>VERIFIED</option><option>REJECTED</option>
        </select></label>
        <label>Membership <select value={filters.membership} onChange={event => change('membership',event.target.value)}>
          <option value="">All memberships</option><option>NOT_ACTIVE</option><option>ACTIVE</option><option>PENDING</option><option>EXPIRED</option><option>CANCELLED</option>
        </select></label>
        <label>Follow-up <select value={filters.followUp} onChange={event => change('followUp',event.target.value)}>
          <option value="">All</option><option value="true">Required</option><option value="false">Not required</option>
        </select></label>
        <label>Registered from <input type="date" value={filters.from} onChange={event => change('from',event.target.value)} /></label>
        <label>Registered to <input type="date" value={filters.to} onChange={event => change('to',event.target.value)} /></label>
      </div>
      <button type="button" onClick={() => setRefresh(count => count+1)}>Refresh</button>
    </section>
    {loading && <p role="status">Loading Portal leads…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && !error && <>
      {rows.length ? <div className={s.list}>{rows.map(row =>
        <button key={row.id} type="button" className={s.item} onClick={() => setSelected(row)}>
          <span><strong>{row.displayName}</strong><small>{row.email || 'No email'} · {row.commercialStatus.replaceAll('_',' ')}</small></span>
          <span className={s.meta}>{userName(row.ownerMemberId)} · {date(row.registeredAt)}</span>
        </button>)}</div> : <p className={s.empty}>No Portal leads match these filters.</p>}
      <div className={s.pager}>
        <button type="button" disabled={offset===0} onClick={() => setOffset(Math.max(0,offset-25))}>Previous</button>
        <span>Page {Math.floor(offset/25)+1}</span>
        <button type="button" disabled={nextOffset===null} onClick={() => setOffset(nextOffset ?? offset)}>Next</button>
      </div>
    </>}
    {selected && <div className={s.overlay} role="presentation" onMouseDown={event => {
      if (event.target===event.currentTarget) setSelected(null)
    }}><section className={s.detail} role="dialog" aria-modal="true" aria-label={selected.displayName}>
      <div className={s.detailHeader}><h2>{selected.displayName}</h2>
        <button type="button" onClick={() => setSelected(null)} aria-label="Close details">×</button></div>
      <dl>
        <dt>Source / registered</dt><dd>{selected.source} · {date(selected.registeredAt)}</dd>
        <dt>Contact</dt><dd>{value(selected.email)} · {value(selected.phone)}</dd>
        <dt>Profile</dt><dd>{selected.profileComplete ? 'Complete' : 'Incomplete'}</dd>
        <dt>Seller / assignment</dt><dd>{userName(selected.ownerMemberId)} · {selected.assignmentStatus} · {date(selected.assignmentAt)}</dd>
        <dt>Rule</dt><dd>{selected.assignmentSource.replaceAll('_',' ')}</dd>
        <dt>Lead / commercial</dt><dd>{selected.leadStatus} · {selected.commercialStatus.replaceAll('_',' ')}</dd>
        <dt>Selection</dt><dd>{value(selected.plan)} · {value(selected.membershipType)} · {value(selected.modality)}</dd>
        <dt>Amount</dt><dd>{selected.amountCents===null ? '—' : `$${(selected.amountCents/100).toFixed(2)}`}</dd>
        <dt>Opportunity</dt><dd>{value(selected.opportunityStage)} · {value(selected.opportunityId)}</dd>
        <dt>Invoice</dt><dd>{selected.invoiceStatus} · {value(selected.invoiceNumber)}</dd>
        <dt>Payment / membership</dt><dd>{selected.paymentStatus} · {selected.membershipStatus}</dd>
        <dt>Family capacity</dt><dd>{selected.familyCount===null ? 'Individual' : `${selected.familyCount}/3`}</dd>
        <dt>Next action</dt><dd>{value(selected.nextAction)}</dd>
        <dt>Follow-up due</dt><dd>{date(selected.nextFollowUpAt)}{selected.nextFollowUpAt && new Date(selected.nextFollowUpAt)<new Date() ? ' · Overdue' : ''}</dd>
        <dt>Last activity</dt><dd>{value(selected.lastActivity)} · {date(selected.lastActivityAt)}</dd>
      </dl>
      {selected.email && <button type="button" onClick={() => onOpenLead(selected.email as string)}>Open Lead and activities</button>}
    </section></div>}
  </>
}
