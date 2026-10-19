'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type Renewal = { id: string; status: string; plan: string; duration: string;
  createdAt: string; reviewedAt?: string | null; decisionNote?: string | null }
type Plan = 'ESSENTIAL'|'PLUS'|'MAX'
type Duration = 'MONTHLY'|'3M'|'6M'|'12M'

export default function NativeMembershipRenewal({ membershipId, currentPlan, currentDuration,
  expiresAt, role, request }: { membershipId: string; currentPlan: string; currentDuration: string;
    expiresAt: string; role: string; request: NativeRequest }) {
  const [requests,setRequests] = useState<Renewal[]>([])
  const [plan,setPlan] = useState<Plan>(['ESSENTIAL','PLUS','MAX'].includes(currentPlan) ? currentPlan as Plan : 'ESSENTIAL')
  const [duration,setDuration] = useState<Duration>(['MONTHLY','3M','6M','12M'].includes(currentDuration)
    ? currentDuration as Duration : 'MONTHLY')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [refresh,setRefresh] = useState(0)
  const key=useRef({payload:'',value:''})
  const canRequest=['SUPERADMIN','ADMINISTRATOR','SALES_MANAGER','SELLER'].includes(role)
  const canReview=['SUPERADMIN','ADMINISTRATOR','SALES_MANAGER'].includes(role)

  useEffect(() => {
    let cancelled=false
    void request(`memberships/${membershipId}/renewals`).then(result => {
      if (!cancelled) setRequests(Array.isArray(result.data) ? result.data as Renewal[] : [])
    }).catch(cause => {if (!cancelled) setError(cause instanceof Error ? cause.message : 'RENEWALS_UNAVAILABLE')})
    return () => {cancelled=true}
  },[membershipId,request,refresh])

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload={plan,duration}
    const serialized=JSON.stringify(payload)
    if (key.current.payload!==serialized) key.current={payload:serialized,value:crypto.randomUUID()}
    setBusy(true);setError('')
    try {
      await request(`memberships/${membershipId}/renewals`,{method:'POST',payload,idempotencyKey:key.current.value})
      key.current={payload:'',value:''};setRefresh(value => value+1)
    } catch(cause) {setError(cause instanceof Error ? cause.message : 'RENEWAL_REQUEST_FAILED')}
    finally {setBusy(false)}
  }

  async function decide(id:string,status:'APPROVED'|'REJECTED') {
    setBusy(true);setError('')
    try {
      await request(`memberships/${membershipId}/renewals/${id}/decision`,{
        method:'POST',payload:{status}})
      setRefresh(value => value+1)
    } catch(cause) {setError(cause instanceof Error ? cause.message : 'RENEWAL_DECISION_FAILED')}
    finally {setBusy(false)}
  }

  return <section className={s.recordActions} aria-label="Membership renewals">
    <h3>Renewal · current term ends {expiresAt.slice(0,10)}</h3>
    <p>Requests are eligible within 30 days of expiry or after expiry. Approval does not extend coverage or confirm payment.</p>
    {requests.length>0 && <ul className={s.scheduleList}>{requests.map(item => <li key={item.id}>
      <span><strong>{item.plan} · {item.duration} · {item.status}</strong>
        <small>Requested {item.createdAt.slice(0,10)}{item.reviewedAt ? ` · Reviewed ${item.reviewedAt.slice(0,10)}` : ''}</small>
        {item.decisionNote && <small>{item.decisionNote}</small>}</span>
      {item.status==='PENDING' && canReview && <span className={s.pdfActions}>
        <button type="button" disabled={busy} onClick={() => void decide(item.id,'APPROVED')}>Approve</button>
        <button type="button" disabled={busy} onClick={() => void decide(item.id,'REJECTED')}>Reject</button>
      </span>}</li>)}</ul>}
    {canRequest && !requests.some(item => item.status==='PENDING') && <form className={s.form} onSubmit={event => void submit(event)}>
      <div className={s.formGrid}>
        <label>Requested plan <select value={plan} onChange={event => setPlan(event.target.value as Plan)}><option>ESSENTIAL</option><option>PLUS</option><option>MAX</option></select></label>
        <label>Requested duration <select value={duration} onChange={event => setDuration(event.target.value as Duration)}>
          <option value="MONTHLY">Month-to-month</option><option value="3M">3 months</option><option value="6M">6 months</option><option value="12M">12 months</option>
        </select></label>
      </div><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Request renewal review'}</button>
    </form>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
