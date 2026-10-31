'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT, type I18nKey } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'
import ui from './MetaConnections.module.css'
type Asset={id:string;integrationId:string;company_code:string;external_asset_id:string;asset_type:string;
  display_name:string;status:string;webhook_status:string;reported_business_id:string|null;relationship:string}
type Connection={id:string;company_code:string;status:string;granted_permissions:string[];provider_cleanup:string;
  provider_cleanup_error:string|null;grant?:{authorizer_member_id:string;status:string;authorized_at:string;expires_at:string;app_id:string;checked_at:string|null;health_error:string|null;authorizer_name?:string}}
type Candidate={id:string;external_id:string;asset_type:string;display_name:string;reported_business_id:string|null;tasks:string[]}
type Snapshot={companies:{code:string;name:string}[];integrations:Connection[];assets:Asset[];canManage:boolean;metaAvailable:boolean}
const statusCopy:Record<string,I18nKey>={CONNECTED:'meta.state.connected',ACTIVE:'meta.state.active',READY:'meta.state.ready',REVOKED:'meta.state.revoked',DEGRADED:'meta.state.degraded',EXPIRED:'meta.state.expired',AUTHORIZER_DEPARTED:'meta.state.departed',LOCAL_DISABLED:'meta.state.disabled',DISABLED:'meta.state.disabled',NOT_REQUESTED:'meta.state.notRequested',PENDING:'meta.state.pending',FAILED:'meta.state.failed',CONFIRMED:'meta.state.confirmed',OWNER_ASSERTED:'meta.ownerAsserted',AGENCY_DELEGATED:'meta.agencyDelegated',PROVIDER_UNAVAILABLE:'meta.state.unavailable',ACCESS_REVOKED:'meta.state.revoked',ASSET_ACCESS_REMOVED:'meta.state.assetAccess',PERMISSION_MISSING:'meta.state.permissions'}
const empty:Snapshot={companies:[],integrations:[],assets:[],canManage:false,metaAvailable:false}
export default function NativeSocialStatus({request,companyCode}: {request:NativeRequest;companyCode?:string}){
 const {t}=useT()
 const status=(value:string)=>t(statusCopy[value] ?? 'meta.state.unknown')
 const [snapshot,setSnapshot]=useState<Snapshot>(empty)
 const [company,setCompany]=useState(companyCode ?? '')
 const [candidates,setCandidates]=useState<Candidate[]>([])
 const [selected,setSelected]=useState<string[]>([])
 const [state,setState]=useState('')
 const [relationship,setRelationship]=useState('OWNER_ASSERTED')
 const [instagram,setInstagram]=useState(false)
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const reload=async()=>{const result=await request('social/connections');setSnapshot(result.data as Snapshot)}
 useEffect(()=>{
  let cancelled=false
  void request('social/connections').then(result=>{if(!cancelled)setSnapshot(result.data as Snapshot)})
   .catch(()=>{if(!cancelled)setError('META_ACCESS_UNAVAILABLE')}).finally(()=>{if(!cancelled)setLoading(false)})
  return()=>{cancelled=true}
 },[request])
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search)
  const grant=params.get('metaState')
  if(params.has('metaError'))setError('META_AUTHORIZATION_FAILED')
  if(!grant)return
  setState(grant)
  let cancelled=false
  void request(`social/meta/pages?${new URLSearchParams({state:grant})}`).then(result=>{
   if(!cancelled){const data=result.data as {companyCode:string;assets:Candidate[]};setCompany(data.companyCode);setCandidates(data.assets)}
  }).catch(()=>{if(!cancelled)setError('META_GRANT_UNAVAILABLE')})
  return()=>{cancelled=true}
 },[request])
 const action=async(work:()=>Promise<void>)=>{
  if(busy)return
  setBusy(true);setError('')
  try{await work()}catch{setError('META_ACTION_UNAVAILABLE')}finally{setBusy(false)}
 }
 const start=async(reconnectIntegrationId?:string)=>{
  const result=await request('social/meta/connect',{method:'POST',payload:{companyCode:company,
   includeInstagram:instagram,...(reconnectIntegrationId?{reconnectIntegrationId}:{})}})
  const data=result.data as {url:string}
  const url=new URL(data.url)
  if(url.origin!=='https://www.facebook.com')throw new Error('META_AUTHORIZATION_INVALID')
  window.location.assign(url.toString())
 }
 const complete=async()=>{
  await request('social/meta/complete',{method:'POST',payload:{state,assetIds:selected,relationship}})
  const url=new URL(window.location.href);url.searchParams.delete('metaState');url.searchParams.delete('metaError')
  window.history.replaceState(null,'',url);setState('');setCandidates([]);setSelected([]);await reload()
 }
 const disconnect=async(id:string)=>{
  if(!window.confirm(t('meta.disconnectConfirm')))return
  await request('social/meta/revoke',{method:'POST',payload:{integrationId:id}});await reload()
 }
 return <section className={`${s.panel} ${ui.connections}`} aria-busy={busy || loading}>
  <h2>{t('meta.integrationTitle')}</h2>
  <p>{t('meta.connectionOnly')}</p>
  {loading && <p role="status">{t('salesNative.loadingConnections')}</p>}
  {error && <p role="alert">{t('meta.actionError')}</p>}
  {!loading && !error && !snapshot.companies.length && <p>{t('meta.noCompany')}</p>}
  {snapshot.companies.length>0 && <>
   <label>{t('meta.company')} <select value={company} disabled={busy || !!state} onChange={e=>setCompany(e.target.value)}>
    <option value="">{t('meta.chooseCompany')}</option>
    {snapshot.companies.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
   </select></label>
   {!snapshot.metaAvailable && <p>{t('meta.configurationRequired')}</p>}
   {!state && <>
    <label><input type="checkbox" checked={instagram} disabled={busy} onChange={e=>setInstagram(e.target.checked)}/>{t('meta.instagramDiscovery')}</label>
    <button type="button" disabled={busy || !snapshot.metaAvailable || !snapshot.companies.some(c=>c.code===company)} onClick={()=>void action(()=>start())}>{t('meta.authorize')}</button>
   </>}
   {state && <fieldset disabled={busy}>
    <legend>{t('meta.selectAssets')}</legend>
    <p>{t('meta.selectionContext')}</p>
    {candidates.map(a=><label key={a.id} className={s.item}>
     <input type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,a.id]:ids.filter(id=>id!==a.id))}/>
     <span>{a.display_name} · {a.asset_type} · {a.external_id}<small>{t('meta.reportedBusiness')}: {a.reported_business_id || t('meta.unknownOwner')}</small></span>
    </label>)}
    <label>{t('meta.relationship')} <select value={relationship} onChange={e=>setRelationship(e.target.value)}>
     <option value="OWNER_ASSERTED">{t('meta.ownerAsserted')}</option><option value="AGENCY_DELEGATED">{t('meta.agencyDelegated')}</option>
    </select></label>
    <p>{t('meta.ownershipNotice')}</p>
    <button type="button" disabled={!selected.length || selected.length>100} onClick={()=>void action(complete)}>{t('meta.saveAssets')}</button>
   </fieldset>}
   {snapshot.integrations.filter(i=>i.company_code===company).map(i=><article key={i.id} className={ui.card}>
    <h3>{snapshot.companies.find(c=>c.code===i.company_code)?.name} · Meta</h3>
    <p>{t('meta.connectionStatus')}: {status(i.status==='REVOKED'?'LOCAL_DISABLED':i.status)} · {i.grant?status(i.grant.status):t('meta.state.unknown')}</p>
    <p>{t('meta.permissions')}: {i.granted_permissions.join(', ') || t('meta.none')}</p>
    <p>{t('meta.authorizer')}: {i.grant?.authorizer_name || t('meta.recordedMember')}</p>
    <p>{t('meta.expires')}: {i.grant?new Date(i.grant.expires_at).toLocaleString():'—'}</p>
    <p>{t('meta.healthCheck')}: {i.grant?.checked_at ? new Date(i.grant.checked_at).toLocaleString() : t('meta.notChecked')} · {i.grant?.health_error ? status(i.grant.health_error) : '—'}</p>
    <p>{t('meta.providerStatus')}: {status(i.provider_cleanup)}</p>
    {i.provider_cleanup!=='CONFIRMED' && i.status==='REVOKED' && <p>{t('meta.cleanupRequired')}</p>}
    {i.grant?.status!=='ACTIVE' && i.status!=='REVOKED' && <p>{t('meta.reconnectRequired')}</p>}
    <ul>{snapshot.assets.filter(a=>a.integrationId===i.id).map(a=><li key={a.id}>{a.display_name} · {a.asset_type} · {a.external_asset_id} · {status(a.relationship)} · {status(a.status)}<br/>{t('meta.reportedBusiness')}: {a.reported_business_id || t('meta.unknownOwner')}</li>)}</ul>
    <button type="button" disabled={busy || !snapshot.metaAvailable || i.grant?.status!=='ACTIVE'} onClick={()=>void action(async()=>{await request('social/meta/health',{method:'POST',payload:{integrationId:i.id}});await reload()})}>{t('meta.healthCheck')}</button>
    <button type="button" disabled={busy || !snapshot.metaAvailable} onClick={()=>void action(()=>start(i.id))}>{t('meta.reconnect')}</button>
    <button type="button" disabled={busy || i.status==='REVOKED'} onClick={()=>void action(()=>disconnect(i.id))}>{t('meta.localDisconnect')}</button>
   </article>)}
  </>}
 </section>
}
