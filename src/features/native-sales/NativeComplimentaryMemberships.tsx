'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useT } from '@/shared/i18n'
import type { NativeRequest } from './NativeSalesModule'
import { benefitActions, benefitDate, validIssueWindow } from './complimentary-presentation'
import s from './NativeSalesModule.module.css'
import styles from './NativeComplimentaryMemberships.module.css'
type Benefit = {id:string;plan:string;duration_months:number;reason:string;beneficiary:string|null;administrator:string|null;authorized_by:string;status:string;code_status:string|null;activated_at:string|null;expires_at:string|null;membership_id:string|null;timezone?:string;valid_from?:string;redeem_before?:string}
type Snapshot = {rows:Benefit[];summary:Record<string,unknown>;nextOffset:number|null;settings:{enabled:boolean;timezone:string;notification_days:number[]}|null}
function TermField({role,label,onCustomChange}:{role:string;label:string;onCustomChange?:(custom:boolean)=>void}) {
 const {t}=useT(),[term,setTerm]=useState('3')
 return <><label>{label}<select name={term==='CUSTOM'?undefined:'months'} value={term} onChange={e=>{setTerm(e.target.value);onCustomChange?.(e.target.value==='CUSTOM')}}>
  {[3,6,12].map(months=><option key={months} value={months}>{months}</option>)}
  {role==='SUPERADMIN'&&<option value="CUSTOM">{t('complimentary.customTerm')}</option>}
 </select></label>{term==='CUSTOM'&&<label>{t('complimentary.customMonths')}<input name="months" type="number" min="1" max="120" defaultValue="5" required/></label>}</>
}
export default function NativeComplimentaryMemberships({request,role}:{request:NativeRequest;role:string}){
 const {t,locale}=useT(),[data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const [delivery,setDelivery]=useState(''),[issuedMethod,setIssuedMethod]=useState(''),[method,setMethod]=useState('REDEMPTION_CODE'),[actionName,setActionName]=useState('REVOKE')
 const [code,setCode]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState(''),[offset,setOffset]=useState(0)
 const [contacts,setContacts]=useState<{id:string;display_name:string}[]>([]),[contactQuery,setContactQuery]=useState(''),[contactError,setContactError]=useState(false)
 const [events,setEvents]=useState<Record<string,unknown>[]>([]),[selected,setSelected]=useState<Benefit|null>(null)
 const [custom,setCustom]=useState(false),[customRequests,setCustomRequests]=useState<Record<string,unknown>[]>([])
 const [reactivation,setReactivation]=useState<Record<string,unknown>|null>(null),dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(reactivation)dialog.current?.showModal();else dialog.current?.close()},[reactivation])
 const key=useRef({payload:'',id:''}),directStart=useRef(new Date().toISOString())
 const load=useCallback(async()=>{const result=await request(`complimentary?${new URLSearchParams({q:query,status,offset:String(offset)})}`);setData(result.data as Snapshot);const pending=await request('complimentary?custom=1');setCustomRequests(pending.data as Record<string,unknown>[])},[request,query,status,offset])
 const refresh=async()=>{try{await load()}catch{setError(t('complimentary.refreshFailed'))}}
 useEffect(()=>{let active=true;void request('complimentary?custom=1').then(result=>{if(active)setCustomRequests(result.data as Record<string,unknown>[])}).catch(()=>{});return()=>{active=false}},[request])
 const failure=(cause:unknown)=>{
  const message=cause instanceof Error?cause.message:''
  return t(message==='COMPLIMENTARY_CONTACT_INCOMPLETE'?'complimentary.contactIncomplete':message==='COMPLIMENTARY_POLICY_PENDING'?'complimentary.policyPending':message==='RATE_LIMITED'?'complimentary.rateLimited':message==='COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED'?'complimentary.accountReview':message==='COMPLIMENTARY_FORBIDDEN'||message==='COMPLIMENTARY_CUSTOM_FORBIDDEN'?'complimentary.forbidden':'complimentary.unavailable')
 }
 useEffect(()=>{let active=true;void request(`complimentary?${new URLSearchParams({q:query,status,offset:String(offset)})}`).then(r=>{if(active){setData(r.data as Snapshot);setError('')}}).catch(()=>{if(active)setError(t('complimentary.unavailable'))});return()=>{active=false}},[request,query,status,offset,t])
 useEffect(()=>{let active=true;void request(`contacts?${new URLSearchParams({q:contactQuery,limit:'50'})}`).then(r=>{if(active){setContacts(Array.isArray(r.data)?r.data as typeof contacts:[]);setContactError(false)}}).catch(()=>{if(active){setContacts([]);setContactError(true)}});return()=>{active=false}},[request,contactQuery])
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);setError('');setNotice('');setDelivery('')
  const contact=String(form.get('contact')||'')||null
  const from=method==='ADMIN_DIRECT'?directStart.current:String(form.get('validFrom'))
  const until=String(form.get('redeemBefore'))
  if(custom){
   const payload={action:'CUSTOM_REQUEST',plan:form.get('plan'),months:Number(form.get('months')),expirationDate:form.get('expirationDate'),reason:form.get('reason'),contactId:contact}
   if([3,6,12].includes(payload.months)){setError(t('complimentary.customStandardError'));return}
   const stable=JSON.stringify(payload);if(key.current.payload!==stable)key.current={payload:stable,id:crypto.randomUUID()}
   setBusy(true);try{await request('complimentary',{method:'POST',payload:{...payload,requestKey:key.current.id}});setNotice(t('complimentary.customSaved'));await refresh()}catch(cause){setError(failure(cause))}finally{setBusy(false)}return
  }
  if(!validIssueWindow(method,from,until,contact)){setError(t(method==='ADMIN_DIRECT'&&!contact?'complimentary.selectMember':'complimentary.invalidDates'));return}
  const payload={action:'ISSUE',plan:form.get('plan'),months:Number(form.get('months')),reason:form.get('reason'),contactId:contact,campaign:form.get('campaign')||null,method,validFrom:new Date(from).toISOString(),redeemBefore:new Date(until).toISOString()}
  const stable=JSON.stringify(payload);if(key.current.payload!==stable)key.current={payload:stable,id:crypto.randomUUID()}
  setBusy(true)
  try{const result=await request('complimentary',{method:'POST',payload:{...payload,requestKey:key.current.id}});setCode(typeof result.code==='string'?result.code:'');setIssuedMethod(method);setDelivery(typeof result.invitationDelivery==='string'?result.invitationDelivery:'');setNotice(t(method==='ADMIN_DIRECT'?'complimentary.directSuccess':'complimentary.issueSuccess'));await refresh()}
  catch(cause){setError(failure(cause))}finally{setBusy(false)}
 }
 async function runAction(payload:Record<string,unknown>){
  setBusy(true);setError('');setNotice('')
  const stable=JSON.stringify(payload);if(key.current.payload!==stable)key.current={payload:stable,id:crypto.randomUUID()}
  try{await request('complimentary',{method:'POST',payload,idempotencyKey:key.current.id});key.current={payload:'',id:''};setSelected(null);setEvents([]);setReactivation(null);setNotice(t('complimentary.actionSuccess'));await refresh()}
  catch(cause){setError(failure(cause));setReactivation(null)}finally{setBusy(false)}
 }
 async function action(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!selected)return;const form=new FormData(event.currentTarget)
  const payload={action:actionName,id:selected.id,months:actionName==='EXTEND'?Number(form.get('months')):null,reason:form.get('reason')}
  if(actionName==='REACTIVATE'){setReactivation(payload);return}
  await runAction(payload)
 }

 const zone=data?.settings?.timezone??'America/New_York'
 const format=(value:string|null|undefined,timeZone=zone,end=false)=>benefitDate(value,locale,timeZone,end)??t('complimentary.notStarted')
 const choices=selected?benefitActions(selected.status,selected.expires_at):[]
 return <details open className={`${s.panel} ${styles.workspace}`}><summary>{t('complimentary.title')}</summary>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <p>{t('complimentary.waiver')}</p>
  <form onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);setError('');setNotice('')
   const timezone=String(form.get('timezone')).trim(),tokens=String(form.get('days')).split(',').map(v=>v.trim()).filter(Boolean),days=tokens.map(Number)
   try{new Intl.DateTimeFormat('en',{timeZone:timezone});if(tokens.length>10||tokens.some(v=>!/^\d+$/.test(v))||days.some(v=>!Number.isInteger(v)||v>365))throw Error('invalid')}
   catch{setError(t('complimentary.invalidSettings'));return}
   setBusy(true);try{await request('complimentary',{method:'POST',payload:{action:'CONFIGURE',timezone,notificationDays:days,enabled:form.get('enabled')==='on'}});setNotice(t('complimentary.settingsSuccess'));await refresh()}catch(cause){setError(failure(cause))}finally{setBusy(false)}}}>
   <label>{t('complimentary.enabled')}<input type="checkbox" name="enabled" defaultChecked={data?.settings?.enabled} key={String(data?.settings?.enabled)}/></label>
   <label>{t('complimentary.timezone')}<input name="timezone" defaultValue={zone} key={zone} required/></label>
   <label>{t('complimentary.notificationDays')}<input name="days" defaultValue={(data?.settings?.notification_days??[30,7,1]).join(',')}/></label>
   <button disabled={busy}>{t('complimentary.saveSettings')}</button>
  </form>
  <h3>{t('complimentary.newBenefit')}</h3>
  <form onSubmit={submit}>
   <label>{t('complimentary.findMember')}<input value={contactQuery} onChange={e=>setContactQuery(e.target.value)} type="search"/></label>
   <label>{t('complimentary.member')}<select name="contact" required={!custom&&method==='ADMIN_DIRECT'} key={contactQuery}><option value="">{t(method==='ADMIN_DIRECT'?'complimentary.chooseMember':'complimentary.unassigned')}</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label>
   <p className={styles.fullWidth}>{t('complimentary.createMember')} {t('complimentary.searchHint')}</p>
   {contactError&&<p role="alert" className={styles.fullWidth}>{t('complimentary.searchFailed')}</p>}
   {contactQuery&&!contactError&&contacts.length===0&&<p role="status" className={styles.fullWidth}>{t('complimentary.noContacts')}</p>}
   <label>{t('complimentary.plan')}<select name="plan"><option>ESSENTIAL</option><option>PLUS</option><option>MAX</option></select></label>
   <TermField role={role} label={t('complimentary.months')} onCustomChange={setCustom}/>
   <label>{t('complimentary.reason')}<input name="reason" list="complimentary-reasons" maxLength={500} required/></label>
   <datalist id="complimentary-reasons"><option value={t('complimentary.reasonCommunity')}/><option value={t('complimentary.reasonEmployee')}/><option value={t('complimentary.reasonCampaign')}/></datalist>
   <label>{t('complimentary.campaign')}<input name="campaign" maxLength={160}/></label>
   {custom&&<><p role="note" className={styles.fullWidth}>{t('complimentary.policyPending')}</p><label>{t('complimentary.explicitExpiration')}<input name="expirationDate" type="date" required/></label></>}
   {!custom&&<><label>{t('complimentary.method')}<select name="method" value={method} onChange={e=>setMethod(e.target.value)}><option value="REDEMPTION_CODE">{t('complimentary.code')}</option><option value="ADMIN_DIRECT">{t('complimentary.direct')}</option></select></label>
   <p className={styles.fullWidth}>{t(method==='ADMIN_DIRECT'?'complimentary.directHint':'complimentary.codeHint')}</p>
   {method!=='ADMIN_DIRECT'&&<label>{t('complimentary.validFrom')}<input type="datetime-local" name="validFrom" required defaultValue={new Date(Date.now()-60000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}/></label>}
   <label>{t(method==='ADMIN_DIRECT'?'complimentary.invitationDeadline':'complimentary.redeemBefore')}<input type="datetime-local" name="redeemBefore" required/></label>
   </>}
   <button disabled={busy||!data?.settings?.enabled}>{t(custom?'complimentary.requestCustom':method==='ADMIN_DIRECT'?'complimentary.activateNow':'complimentary.authorize')}</button>
  </form>
  {delivery&&<p role="status">{t('complimentary.invitationStatus')}: {t(`complimentary.delivery.${delivery}` as Parameters<typeof t>[0])}</p>}
  {code&&<div role="status"><p>{t(issuedMethod==='ADMIN_DIRECT'?'complimentary.invitationCode':'complimentary.copyOnce')}</p><output>{code}</output><button onClick={()=>{setCode('');key.current={payload:'',id:''};directStart.current=new Date().toISOString()}}>{t('complimentary.dismissCode')}</button></div>}
  {data&&<><h3>{t('complimentary.report')}</h3><dl>{Object.entries(data.summary).map(([key,value])=><div key={key}><dt>{t(`complimentary.metric.${key}` as Parameters<typeof t>[0])}</dt><dd>{typeof value==='object'?Object.entries(value as Record<string,number>).map(([k,v])=>`${k}: ${v}`).join(' · '):String(value)}</dd></div>)}</dl></>}
  <label>{t('complimentary.search')}<input value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/></label>
  <label>{t('complimentary.status')}<select value={status} onChange={e=>{setStatus(e.target.value);setOffset(0)}}><option value="">{t('complimentary.all')}</option>{['PENDING','ACTIVE','EXPIRED','SUSPENDED','REVOKED','REDEEMED','UNUSED'].map(v=><option key={v} value={v}>{t(`complimentary.state.${v}` as Parameters<typeof t>[0])}</option>)}</select></label>
  <ul>{data?.rows.map(row=><li key={row.id}><button className={styles.benefit} onClick={async()=>{setSelected(row);setActionName(benefitActions(row.status,row.expires_at)[0]??'REVOKE');setEvents([]);try{const result=await request(`complimentary?benefit=${row.id}`);setEvents(result.data as typeof events)}catch(cause){setError(failure(cause))}}}>
   <strong>{row.beneficiary??t('complimentary.unassigned')} · {row.plan} · {row.duration_months} {t('complimentary.monthsUnit')}</strong>
   <span>{t(`complimentary.state.${row.status}` as Parameters<typeof t>[0])}{row.code_status?` · ${t(`complimentary.state.${row.code_status}` as Parameters<typeof t>[0])}`:''} · {row.administrator??row.authorized_by}</span>
   <span>{row.activated_at?`${t('complimentary.starts')}: ${format(row.activated_at,row.timezone)} · ${t('complimentary.ends')}: ${format(row.expires_at,row.timezone,true)}`:t('complimentary.pendingDates')}</span>
   <span>{t('complimentary.timezone')}: {row.timezone??zone}</span>
  </button></li>)}</ul>
  {data?.rows.length===0&&<p>{t('complimentary.noBenefits')}</p>}
  <button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-50))}>{t('complimentary.previous')}</button><button disabled={data?.nextOffset==null} onClick={()=>setOffset(data?.nextOffset??0)}>{t('complimentary.next')}</button>
  {selected&&<section aria-label={t('complimentary.action')}><h3>{selected.beneficiary??t('complimentary.unassigned')}</h3><p>{selected.reason}</p>
   <p>{t('complimentary.starts')}: {format(selected.activated_at,selected.timezone)} · {t('complimentary.ends')}: {format(selected.expires_at,selected.timezone,true)}</p>
   {choices.length>0?<form onSubmit={action}>
    <label>{t('complimentary.action')}<select name="action" value={actionName} onChange={e=>setActionName(e.target.value)}>{choices.map(value=><option key={value} value={value}>{t(value==='EXTEND'?'complimentary.extend':value==='SUSPEND'?'complimentary.suspend':value==='REACTIVATE'?'complimentary.reactivate':'complimentary.revoke')}</option>)}</select></label>
    {actionName==='EXTEND'&&<TermField role="ADMINISTRATOR" label={t('complimentary.extensionMonths')}/>}
    <label>{t('complimentary.reason')}<input name="reason" maxLength={500} required/></label>
    <p className={styles.fullWidth}>{t(actionName==='REVOKE'?'complimentary.revokeHint':actionName==='SUSPEND'?'complimentary.suspendHint':actionName==='REACTIVATE'?'complimentary.reactivateHint':'complimentary.extendHint')}</p>
    {actionName==='REVOKE'&&<label className={styles.fullWidth}>{t('complimentary.revokeConfirm')}<input type="checkbox" required key={selected.id}/></label>}
    <button disabled={busy}>{t('complimentary.save')}</button>
   </form>:<p>{t('complimentary.noActions')}</p>}
   <h4>{t('complimentary.history')}</h4><ul>{events.map(e=><li key={String(e.id)}>{benefitDate(String(e.created_at),locale,selected.timezone??zone,false,true)} · {t(`complimentary.event.${e.action}` as Parameters<typeof t>[0])} · {String(e.reason??'')} · {e.actor_member_id?`${t('complimentary.actor')}: ${String(e.actor_member_id)}`:t(e.actor_auth_id?'complimentary.memberActor':'complimentary.systemActor')}</li>)}</ul>
  </section>}
  <h3>{t('complimentary.customRequests')}</h3><p>{t('complimentary.policyPending')}</p><ul>{customRequests.map(row=><li key={String(row.id)}>{String(row.plan)} · {String(row.duration_months)} {t('complimentary.monthsUnit')} · {t('complimentary.explicitExpiration')}: {String(row.expiration_date)} · {String(row.reason)} · {t('complimentary.actor')}: {String(row.requested_by)} · {String(row.created_at)} · {t('complimentary.pendingPolicyState')}</li>)}</ul>
  <dialog ref={dialog} onCancel={()=>setReactivation(null)} aria-labelledby="reactivation-title"><h3 id="reactivation-title">{t('complimentary.confirmReactivation')}</h3><p>{t('complimentary.reactivateHint')}</p><p>{selected?.beneficiary} · {t('complimentary.ends')}: {format(selected?.expires_at,selected?.timezone,true)}</p><button type="button" disabled={busy} onClick={()=>setReactivation(null)}>{t('complimentary.cancel')}</button><button type="button" disabled={busy} onClick={()=>{if(reactivation)void runAction(reactivation)}}>{t('complimentary.confirmReactivation')}</button></dialog>
 </details>
}
