'use client'
import { type FormEvent, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type Row = Record<string,unknown> & { id: string }
type Resource = 'leads'|'contacts'|'accounts'|'opportunities'|'activities'
type Stage = { id:string; code:string; name:string; pipelineId:string }
type Person = { memberId:string; displayName:string; teamIds:string[] }
type Team = { id:string; name:string }
const leadStages = ['NEW','ASSIGNED','ATTEMPTING_CONTACT','CONTACTED','QUALIFIED',
  'FOLLOW_UP','UNRESPONSIVE','NOT_INTERESTED','PROPOSAL','PAYMENT_PENDING','WON','LOST']
const opportunityStages = new Set(['NEW','CONTACTED','QUALIFIED','PROPOSAL','PAYMENT_PENDING','WON','LOST'])
const errorText: Record<string,string> = {
  REASSIGN_FORBIDDEN:'You do not have permission to reassign this Lead.',
  SALES_ACCESS_DENIED:'Your Sales role does not allow this action.',
  VERSION_CONFLICT:'This record changed. Refresh it before trying again.',
  INVALID_LEAD_TRANSITION:'This Lead cannot move to that stage.',
  INVALID_STAGE_TRANSITION:'This Opportunity cannot move to that stage.',
  LEAD_WON_REQUIRES_PAID_OPPORTUNITY:'A paid Opportunity is required before marking the Lead Won.',
  CONFIRMED_PAYMENT_REQUIRED:'Payment evidence is required before marking this Opportunity Won.',
  ACTIVE_MEMBERSHIP_REQUIRED:'An active membership is required before marking this Opportunity Won.',
  ACTIVITY_STATE_CONFLICT:'This Activity is no longer pending.',
}
const label = (code: string) => code.toLowerCase().replaceAll('_',' ').replace(/^./,first => first.toUpperCase())

export default function NativeSalesRecordActions({ resource,row,canWrite,canReassign,stages,users,teams,requestedStage,request,onSaved }: {
  resource: Resource; row: Row; canWrite: boolean; canReassign: boolean;
  stages: Stage[]; users: Person[]; teams: Team[]; requestedStage?: string;
  request: NativeRequest; onSaved: () => void
}) {
  const [name,setName] = useState(String(row.display_name ?? row.name ?? ''))
  const [email,setEmail] = useState(String(row.email ?? ''))
  const [phone,setPhone] = useState(String(row.phone ?? ''))
  const [source,setSource] = useState(String(row.source ?? ''))
  const [stage,setStage] = useState(requestedStage || '')
  const [stageReason,setStageReason] = useState('')
  const [archiveReason,setArchiveReason] = useState('')
  const [activityKind,setActivityKind] = useState('FOLLOW_UP')
  const [activityTitle,setActivityTitle] = useState('')
  const [activityBody,setActivityBody] = useState('')
  const [dueAt,setDueAt] = useState('')
  const [owner,setOwner] = useState(String(row.owner_member_id ?? ''))
  const [team,setTeam] = useState(String(row.team_id ?? ''))
  const [conversionAccount,setConversionAccount] = useState(String(row.company_name ?? ''))
  const [conversionOpportunity,setConversionOpportunity] = useState(false)
  const [conversionAmount,setConversionAmount] = useState('')
  const [conversionDate,setConversionDate] = useState(new Date().toISOString().slice(0,10))
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const activityKey = useRef({ payload:'', value:'' })
  const conversionKey = useRef({ payload:'', value:'' })
  const version = Number(row.version)
  const validVersion = Number.isSafeInteger(version) && version>0
  const currentPipelineId = stages.find(item => item.id===row.stage_id)?.pipelineId

  async function submit(path: string, payload: Record<string,unknown>, method: 'POST'|'PATCH', idempotencyKey?: string) {
    setBusy(true); setError('')
    try {
      await request(path,{ method,payload,version:method==='PATCH' || path.includes('/transitions') ||
        path.includes('/reassign') || path.includes('/archive') || path.includes('/status') ||
        path.includes('/convert') ? version : undefined,
      idempotencyKey })
      onSaved()
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : 'SAVE_FAILED'
      setError(errorText[code] || code)
    } finally { setBusy(false) }
  }
  function prevent(event: FormEvent<HTMLFormElement>, action: () => void) { event.preventDefault(); action() }
  if (!canWrite || !validVersion) return null
  return <div className={s.recordActions}>
    {['leads','contacts','accounts'].includes(resource) && <form className={s.form} onSubmit={event => prevent(event,() => {
      const payload = resource==='accounts' ? { name:name.trim(),...(email.trim()?{email:email.trim()}:{}),
        ...(phone.trim()?{phone:phone.trim()}:{}),...(source.trim()?{source:source.trim()}:{}) } :
        { displayName:name.trim(),...(email.trim()?{email:email.trim()}:{}),
          ...(phone.trim()?{phone:phone.trim()}:{}),...(source.trim()?{source:source.trim()}:{}) }
      void submit(`${resource}/${row.id}`,payload,'PATCH')
    })}>
      <h3>Edit details</h3><div className={s.formGrid}>
        <label>Name <input required maxLength={500} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Email <input type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Phone <input value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label>Source <input value={source} onChange={event => setSource(event.target.value)} /></label>
      </div><button type="submit" disabled={busy}>Save details</button>
    </form>}
    {(resource==='leads' || resource==='opportunities') && <form className={s.form} onSubmit={event => prevent(event,() => {
      const payload = resource==='leads' ? { toStatus:stage } :
        { stageCode:stage,...(stage==='LOST'?{lostReason:stageReason.trim()}:{}),
          ...(stage==='WON'?{actualCloseDate:new Date().toISOString().slice(0,10)}:{}),
          ...(stageReason.trim() && stage!=='LOST'?{reason:stageReason.trim()}:{}) }
      void submit(resource==='leads' ? `leads/${row.id}/transitions` :
        `opportunities/${row.id}/transitions`,payload,'POST')
    })}>
      <h3>Move stage</h3><label>New stage <select required value={stage} onChange={event => setStage(event.target.value)}>
        <option value="">Choose a stage</option>
        {(resource==='leads' ? leadStages.map(code => ({code,name:label(code)})) :
          stages.filter(item => opportunityStages.has(item.code) && item.pipelineId===currentPipelineId)).map(item =>
          <option key={item.code} value={item.code}>{item.name}</option>)}
      </select></label>
      {resource==='opportunities' && <label>{stage==='LOST' ? 'Loss reason' : 'Reason (for reopen)'}
        <input required={stage==='LOST'} maxLength={500} value={stageReason} onChange={event => setStageReason(event.target.value)} /></label>}
      <button type="submit" disabled={busy || !stage}>Save stage</button>
    </form>}
    {resource==='leads' && canReassign && <form className={s.form} onSubmit={event => prevent(event,() =>
      void submit(`leads/${row.id}/reassign`,{ownerMemberId:owner,teamId:team || null},'POST'))}>
      <h3>Reassign Lead</h3><div className={s.formGrid}>
        <label>Owner <select required value={owner} onChange={event => setOwner(event.target.value)}>
          {users.map(person => <option key={person.memberId} value={person.memberId}>{person.displayName}</option>)}
        </select></label>
        <label>Team <select value={team} onChange={event => setTeam(event.target.value)}>
          <option value="">No team</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
      </div><button type="submit" disabled={busy || !owner}>Save assignment</button>
    </form>}
    {resource==='leads' && row.status!=='CONVERTED' && <form className={s.form} onSubmit={event => prevent(event,() => {
      const payload: Record<string,unknown> = {
        ...(conversionAccount.trim()?{accountName:conversionAccount.trim()}:{}) }
      if (conversionOpportunity) payload.opportunity = {
        name:`${name.trim()} Opportunity`,currency:'USD',amount:conversionAmount.trim(),
        expectedCloseDate:conversionDate }
      const serialized=JSON.stringify(payload)
      if (conversionKey.current.payload!==serialized)
        conversionKey.current={payload:serialized,value:crypto.randomUUID()}
      void submit(`leads/${row.id}/convert`,payload,'POST',conversionKey.current.value)
    })}>
      <h3>Convert Lead</h3>
      <p className={s.caption}>Creates or links a Contact and Account. An Opportunity is optional.</p>
      <label>New Account name <input maxLength={500} value={conversionAccount} onChange={event => setConversionAccount(event.target.value)} /></label>
      <label className={s.checkbox}><input type="checkbox" checked={conversionOpportunity} onChange={event => setConversionOpportunity(event.target.checked)} /> Create Opportunity</label>
      {conversionOpportunity && <div className={s.formGrid}>
        <label>Opportunity amount (USD) <input required type="number" min="0" step="0.01" value={conversionAmount} onChange={event => setConversionAmount(event.target.value)} /></label>
        <label>Expected close <input required type="date" value={conversionDate} onChange={event => setConversionDate(event.target.value)} /></label>
      </div>}
      <button type="submit" disabled={busy}>Convert Lead</button>
    </form>}
    {['leads','contacts','accounts','opportunities'].includes(resource) && <form className={s.form} onSubmit={event => prevent(event,() => {
      const due = dueAt ? new Date(dueAt) : null
      if (due && Number.isNaN(due.getTime())) { setError('Invalid due date.'); return }
      const payload = { resource,recordId:row.id,kind:activityKind,title:activityTitle.trim(),
        ...(activityBody.trim()?{body:activityBody.trim()}:{}),
        ...(due?{dueAt:due.toISOString()}:{}), }
      const serialized = JSON.stringify(payload)
      if (activityKey.current.payload!==serialized)
        activityKey.current={payload:serialized,value:crypto.randomUUID()}
      void submit('activities',payload,'POST',activityKey.current.value)
    })}>
      <h3>Add activity or follow-up</h3><div className={s.formGrid}>
        <label>Kind <select value={activityKind} onChange={event => setActivityKind(event.target.value)}>
          <option value="NOTE">Note</option><option value="TASK">Task</option><option value="CALL_ATTEMPT">Call attempt</option>
          <option value="MEETING">Meeting</option><option value="FOLLOW_UP">Follow-up</option>
        </select></label>
        <label>Due <input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label>
      </div><label>Title <input required maxLength={240} value={activityTitle} onChange={event => setActivityTitle(event.target.value)} /></label>
      <label>Details <textarea maxLength={20000} value={activityBody} onChange={event => setActivityBody(event.target.value)} /></label>
      <button type="submit" disabled={busy}>Save activity</button>
    </form>}
    {resource==='activities' && row.status==='PENDING' && row.kind!=='EMAIL' &&
      <div className={s.pdfActions}><button type="button" disabled={busy} onClick={() => void submit(
        `activities/${row.id}/status`,{status:'COMPLETED'},'POST')}>Complete</button>
        <button type="button" disabled={busy} onClick={() => void submit(
          `activities/${row.id}/status`,{status:'CANCELLED'},'POST')}>Cancel</button></div>}
    {resource==='leads' && canReassign && <form className={s.form} onSubmit={event => prevent(event,() =>
      void submit(`leads/${row.id}/archive`,{reason:archiveReason.trim(),restore:false},'POST'))}>
      <h3>Archive Lead</h3><label>Reason <input required maxLength={1000} value={archiveReason} onChange={event => setArchiveReason(event.target.value)} /></label>
      <button type="submit" disabled={busy || !archiveReason.trim()}>Archive</button>
    </form>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </div>
}
