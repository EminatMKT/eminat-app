'use client'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Row = Record<string,unknown> & { id: string }
type Resource = 'leads'|'contacts'|'accounts'|'opportunities'|'activities'
type Stage = { id:string; code:string; name:string; pipelineId:string }
type Person = { memberId:string; displayName:string; teamIds:string[] }
type Team = { id:string; name:string }
type Contact = { id:string; display_name:string }
type Account = { id:string; name:string }
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
  AMOUNT_LOCKED:'The amount cannot change after payment or closing.',
}
const label = (code: string) => code.toLowerCase().replaceAll('_',' ').replace(/^./,first => first.toUpperCase())

export default function NativeSalesRecordActions({ resource,row,canWrite,canReassign,stages,users,teams,requestedStage,request,onSaved }: {
  resource: Resource; row: Row; canWrite: boolean; canReassign: boolean;
  stages: Stage[]; users: Person[]; teams: Team[]; requestedStage?: string;
  request: NativeRequest; onSaved: () => void
}) {
  const { t } = useT()
  const [name,setName] = useState(String(row.display_name ?? row.name ?? ''))
  const [email,setEmail] = useState(String(row.email ?? ''))
  const [phone,setPhone] = useState(String(row.phone ?? ''))
  const [source,setSource] = useState(String(row.source ?? ''))
  const [amount,setAmount] = useState(row.amount === null ? '' : String(row.amount ?? ''))
  const [closeDate,setCloseDate] = useState(String(row.expected_close_date ?? '').slice(0,10))
  const [product,setProduct] = useState(String(row.product ?? ''))
  const [description,setDescription] = useState(String(row.description ?? ''))
  const [contactId,setContactId] = useState(String(row.primary_contact_id ?? ''))
  const [contactQuery,setContactQuery] = useState('')
  const [contacts,setContacts] = useState<Contact[]>([])
  const [contactError,setContactError] = useState('')
  const [contactAccountId,setContactAccountId] = useState(String(row.primary_account_id ?? ''))
  const [accountQuery,setAccountQuery] = useState('')
  const [accounts,setAccounts] = useState<Account[]>([])
  const [accountError,setAccountError] = useState('')
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

  useEffect(() => {
    if (resource!=='opportunities') return
    let cancelled=false
    const params=new URLSearchParams({limit:'50'})
    if (contactQuery.trim()) params.set('q',contactQuery.trim())
    const current=contactId ? request(`contacts/${contactId}`).then(result => result.data as Contact).catch(() => null) : Promise.resolve(null)
    void Promise.all([request(`contacts?${params}`),current]).then(([result,selected]) => {
      if (cancelled) return
      const visible=Array.isArray(result.data) ? result.data as Contact[] : []
      setContacts(selected && !visible.some(item => item.id===selected.id) ? [selected,...visible] : visible)
      setContactError('')
    }).catch(() => { if (!cancelled) setContactError('Contact search is unavailable.') })
    return () => { cancelled=true }
  },[resource,contactQuery,contactId,request])
  useEffect(() => {
    if (resource!=='contacts') return
    let cancelled=false
    const params=new URLSearchParams({limit:'50'})
    if (accountQuery.trim()) params.set('q',accountQuery.trim())
    const current=contactAccountId ? request(`accounts/${contactAccountId}`).then(result => result.data as Account).catch(() => null) : Promise.resolve(null)
    void Promise.all([request(`accounts?${params}`),current]).then(([result,selected]) => {
      if (cancelled) return
      const visible=Array.isArray(result.data) ? result.data as Account[] : []
      setAccounts(selected && !visible.some(item => item.id===selected.id) ? [selected,...visible] : visible)
      setAccountError('')
    }).catch(() => { if (!cancelled) setAccountError('Account search is unavailable.') })
    return () => { cancelled=true }
  },[resource,accountQuery,contactAccountId,request])

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
  if (resource==='leads' && row.archived_at) return canReassign ? <div className={s.recordActions}>
    <form className={s.form} onSubmit={event => prevent(event,() => void submit(
      `leads/${row.id}/archive`,{reason:archiveReason.trim(),restore:true},'POST'))}>
      <h3>{t('salesNative.restoreLead')}</h3>
      <label>{t('salesNative.auditReason')} <input required maxLength={1000} value={archiveReason} onChange={event => setArchiveReason(event.target.value)} /></label>
      <button type="submit" disabled={busy || !archiveReason.trim()}>{t('salesNative.restore')}</button>
    </form>
    {error && <p role="alert" className={s.error}>{error}</p>}
  </div> : null
  return <div className={s.recordActions}>
    {resource==='opportunities' && <form className={s.form} onSubmit={event => prevent(event,() => void submit(
      `opportunities/${row.id}`,{
        name:name.trim(),expectedCloseDate:closeDate,
        ...(amount!==String(row.amount ?? '') ? {amount:amount || null} : {}),
        source:source.trim() || null,product:product.trim() || null,
        description:description.trim() || null,
        ...(contactId!==String(row.primary_contact_id ?? '') ? {primaryContactId:contactId || null} : {}),
      },'PATCH'))}>
      <h3>{t('salesNative.editOpportunity')}</h3><div className={s.formGrid}>
        <label>{t('salesNative.auditName')} <input required maxLength={500} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>{t('salesNative.auditExpectedClose')} <input required type="date" value={closeDate} onChange={event => setCloseDate(event.target.value)} /></label>
        <label>{t('salesNative.auditAmount')} ({String(row.currency ?? 'USD')}) <input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label>{t('salesNative.auditSource')} <input maxLength={500} value={source} onChange={event => setSource(event.target.value)} /></label>
        <label>{t('salesNative.auditProduct')} <input maxLength={500} value={product} onChange={event => setProduct(event.target.value)} /></label>
        <label>{t('salesNative.auditFindContact')} <input value={contactQuery} onChange={event => setContactQuery(event.target.value)} placeholder={t('salesNative.searchByName')} /></label>
        <label>{t('salesNative.auditPrimaryContact')} <select value={contactId} onChange={event => setContactId(event.target.value)}>
          <option value="">{t('salesNative.noPrimaryContact')}</option>
          {contactId && !contacts.some(contact => contact.id===contactId) &&
            <option value={contactId}>{t('salesNative.currentContactRestrictedOrUnavailable')}</option>}
          {contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}
        </select></label>
      </div><label>{t('salesNative.auditDescription')} <textarea maxLength={10000} value={description} onChange={event => setDescription(event.target.value)} /></label>
      {contactError && <p role="alert" className={s.error}>{contactError}</p>}
      <button type="submit" disabled={busy}>{t('salesNative.saveDetails')}</button>
    </form>}
    {['leads','contacts','accounts'].includes(resource) && <form className={s.form} onSubmit={event => prevent(event,() => {
      const payload = resource==='accounts' ? { name:name.trim(),...(email.trim()?{email:email.trim()}:{}),
        ...(phone.trim()?{phone:phone.trim()}:{}),...(source.trim()?{source:source.trim()}:{}) } :
        { displayName:name.trim(),...(email.trim()?{email:email.trim()}:{}),
          ...(phone.trim()?{phone:phone.trim()}:{}),...(source.trim()?{source:source.trim()}:{}),
          ...(resource==='contacts' && contactAccountId!==String(row.primary_account_id ?? '')
            ? {primaryAccountId:contactAccountId || null} : {}) }
      void submit(`${resource}/${row.id}`,payload,'PATCH')
    })}>
      <h3>{t('salesNative.editDetails')}</h3><div className={s.formGrid}>
        <label>{t('salesNative.auditName')} <input required maxLength={500} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>{t('salesNative.email')} <input type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>{t('salesNative.auditPhone')} <input value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label>{t('salesNative.auditSource')} <input value={source} onChange={event => setSource(event.target.value)} /></label>
        {resource==='contacts' && <>
          <label>{t('salesNative.auditFindAccount')} <input value={accountQuery} onChange={event => setAccountQuery(event.target.value)} placeholder={t('salesNative.searchByName')} /></label>
          <label>{t('salesNative.auditPrimaryAccount')} <select value={contactAccountId} onChange={event => setContactAccountId(event.target.value)}>
            <option value="">{t('salesNative.noPrimaryAccount')}</option>
            {contactAccountId && !accounts.some(account => account.id===contactAccountId) &&
              <option value={contactAccountId}>{t('salesNative.currentAccountRestrictedOrUnavailable')}</option>}
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select></label>
        </>}
      </div><button type="submit" disabled={busy}>{t('salesNative.saveDetails')}</button>
      {accountError && <p role="alert" className={s.error}>{accountError}</p>}
    </form>}
    {(resource==='leads' || resource==='opportunities') && <form className={s.form} onSubmit={event => prevent(event,() => {
      const payload = resource==='leads' ? { toStatus:stage } :
        { stageCode:stage,...(stage==='LOST'?{lostReason:stageReason.trim()}:{}),
          ...(stage==='WON'?{actualCloseDate:new Date().toISOString().slice(0,10)}:{}),
          ...(stageReason.trim() && stage!=='LOST'?{reason:stageReason.trim()}:{}) }
      void submit(resource==='leads' ? `leads/${row.id}/transitions` :
        `opportunities/${row.id}/transitions`,payload,'POST')
    })}>
      <h3>{t('salesNative.moveStage')}</h3><label>{t('salesNative.auditNewStage')} <select required value={stage} onChange={event => setStage(event.target.value)}>
        <option value="">{t('salesNative.chooseAStage')}</option>
        {(resource==='leads' ? leadStages.map(code => ({code,name:label(code)})) :
          stages.filter(item => opportunityStages.has(item.code) && item.pipelineId===currentPipelineId)).map(item =>
          <option key={item.code} value={item.code}>{item.name}</option>)}
      </select></label>
      {resource==='opportunities' && <label>{stage==='LOST' ? t('salesNative.lossReason') : t('salesNative.reopenReason')}
        <input required={stage==='LOST'} maxLength={500} value={stageReason} onChange={event => setStageReason(event.target.value)} /></label>}
      <button type="submit" disabled={busy || !stage}>{t('salesNative.saveStage')}</button>
    </form>}
    {resource==='leads' && canReassign && <form className={s.form} onSubmit={event => prevent(event,() =>
      void submit(`leads/${row.id}/reassign`,{ownerMemberId:owner,teamId:team || null},'POST'))}>
      <h3>{t('salesNative.reassignLead')}</h3><div className={s.formGrid}>
        <label>{t('salesNative.owner')} <select required value={owner} onChange={event => setOwner(event.target.value)}>
          {users.map(person => <option key={person.memberId} value={person.memberId}>{person.displayName}</option>)}
        </select></label>
        <label>{t('salesNative.team')} <select value={team} onChange={event => setTeam(event.target.value)}>
          <option value="">{t('salesNative.noTeam')}</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
      </div><button type="submit" disabled={busy || !owner}>{t('salesNative.saveAssignment')}</button>
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
      <h3>{t('salesNative.convertLead')}</h3>
      <p className={s.caption}>{t('salesNative.createsOrLinksAContactAndAccountAn')}</p>
      <label>{t('salesNative.auditNewAccountName')} <input maxLength={500} value={conversionAccount} onChange={event => setConversionAccount(event.target.value)} /></label>
      <label className={s.checkbox}><input type="checkbox" checked={conversionOpportunity} onChange={event => setConversionOpportunity(event.target.checked)} /> {t('salesNative.createOpportunity')}</label>
      {conversionOpportunity && <div className={s.formGrid}>
        <label>{t('salesNative.auditOpportunityAmountUsd')} <input required type="number" min="0" step="0.01" value={conversionAmount} onChange={event => setConversionAmount(event.target.value)} /></label>
        <label>{t('salesNative.auditExpectedClose')} <input required type="date" value={conversionDate} onChange={event => setConversionDate(event.target.value)} /></label>
      </div>}
      <button type="submit" disabled={busy}>{t('salesNative.convertLead')}</button>
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
      <h3>{t('salesNative.addActivityOrFollowUp')}</h3><div className={s.formGrid}>
        <label>{t('salesNative.auditKind')} <select value={activityKind} onChange={event => setActivityKind(event.target.value)}>
          <option value="NOTE">{t('salesNative.note')}</option><option value="TASK">{t('salesNative.auditTask')}</option><option value="CALL_ATTEMPT">{t('salesNative.auditCallAttempt')}</option>
          <option value="MEETING">{t('salesNative.meeting')}</option><option value="FOLLOW_UP">{t('salesNative.auditFollowUp')}</option>
        </select></label>
        <label>{t('salesNative.auditDue')} <input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label>
      </div><label>{t('salesNative.auditTitle')} <input required maxLength={240} value={activityTitle} onChange={event => setActivityTitle(event.target.value)} /></label>
      <label>{t('salesNative.auditDetails')} <textarea maxLength={20000} value={activityBody} onChange={event => setActivityBody(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{t('salesNative.saveActivity')}</button>
    </form>}
    {resource==='activities' && row.status==='PENDING' && row.kind!=='EMAIL' &&
      <div className={s.pdfActions}><button type="button" disabled={busy} onClick={() => void submit(
        `activities/${row.id}/status`,{status:'COMPLETED'},'POST')}>{t('salesNative.complete')}</button>
        <button type="button" disabled={busy} onClick={() => void submit(
          `activities/${row.id}/status`,{status:'CANCELLED'},'POST')}>{t('salesNative.cancel')}</button></div>}
    {resource==='leads' && canReassign && <form className={s.form} onSubmit={event => prevent(event,() =>
      void submit(`leads/${row.id}/archive`,{reason:archiveReason.trim(),restore:false},'POST'))}>
      <h3>{t('salesNative.archiveLead')}</h3><label>{t('salesNative.auditReason')} <input required maxLength={1000} value={archiveReason} onChange={event => setArchiveReason(event.target.value)} /></label>
      <button type="submit" disabled={busy || !archiveReason.trim()}>{t('salesNative.archive')}</button>
    </form>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </div>
}
