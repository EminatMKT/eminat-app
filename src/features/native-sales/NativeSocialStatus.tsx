'use client'
import { useEffect, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'
import ui from './MetaConnections.module.css'
import MetaCompanyOnboarding from './MetaCompanyOnboarding'
import {statusCopy,type Snapshot,type Candidate} from './meta-connection-metadata'
const empty:Snapshot={companies:[],integrations:[],assets:[],canManage:false,metaAvailable:false}
export default function NativeSocialStatus({request,companyCode,manageCompanies=false,role}: {request:NativeRequest;companyCode?:string;manageCompanies?:boolean;role?:string}){
 const {t}=useT()
 const status=(value:string)=>t(statusCopy[value] ?? 'meta.state.unknown')
 // Callers that already filter to ADMINISTRATOR/SUPERADMIN org memberships before this
 // ever mounts (the Settings/Sales-native integrations pages, via MetaConnectionsWorkspace)
 // don't pass `role` and keep today's behavior (fetch, let the server 403). The Sales
 // module's own "social" tab has no such filtering and passes the caller's real role, so a
 // SELLER/non-admin never fires the doomed fetch at all (PR #209 review finding #6 — this
 // restores the early-exit `main` had before this PR's rewrite dropped it).
 const canManage=!role || role==='SUPERADMIN' || role==='ADMINISTRATOR'
 const [snapshot,setSnapshot]=useState<Snapshot>(empty)
 const [company,setCompany]=useState(companyCode ?? '')
 const [candidates,setCandidates]=useState<Candidate[]>([])
 const [selected,setSelected]=useState<string[]>([])
 const [state,setState]=useState('')
 const [relationship,setRelationship]=useState('')
 const [instagram,setInstagram]=useState(false)
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [search,setSearch]=useState('')
 const [discovering,setDiscovering]=useState(false)
 const [notice,setNotice]=useState(false)
 const reload=async()=>{const result=await request('social/connections');setSnapshot(result.data as Snapshot)}
 useEffect(()=>{
  if(!canManage){setLoading(false);return}
  let cancelled=false
  void request('social/connections').then(result=>{if(!cancelled)setSnapshot(result.data as Snapshot)})
   .catch(()=>{if(!cancelled)setError('META_ACCESS_UNAVAILABLE')}).finally(()=>{if(!cancelled)setLoading(false)})
  return()=>{cancelled=true}
 },[canManage,request])
 useEffect(()=>{
  if(!canManage)return
  const params=new URLSearchParams(window.location.search)
  const grant=params.get('metaState')
  // Pass through the specific reason when the server gave us one (currently only
  // META_PERMISSION_UNAVAILABLE); everything else still falls back to the generic
  // message the server itself collapses to (PR #209 review finding #5).
  if(params.has('metaError'))setError(params.get('metaError')==='META_PERMISSION_UNAVAILABLE'?'META_PERMISSION_UNAVAILABLE':'META_AUTHORIZATION_FAILED')
  if(!grant)return
  setState(grant)
  setDiscovering(true)
  let cancelled=false
  void request(`social/meta/pages?${new URLSearchParams({state:grant})}`).then(result=>{
   if(!cancelled){const data=result.data as {companyCode:string;assets:Candidate[]};setCompany(data.companyCode);setCandidates(data.assets)}
  }).catch(()=>{if(!cancelled)setError('META_GRANT_UNAVAILABLE')}).finally(()=>{if(!cancelled)setDiscovering(false)})
  return()=>{cancelled=true}
 },[canManage,request])
 const action=async(work:()=>Promise<void>)=>{
  if(busy)return
  setBusy(true);setError('');setNotice(false)
  try{await work()}catch(cause){setError(cause instanceof Error?cause.message:'META_ACTION_UNAVAILABLE')}finally{setBusy(false)}
 }
 const start=async(reconnectIntegrationId?:string,targetCompany=company)=>{
  const result=await request('social/meta/connect',{method:'POST',payload:{companyCode:targetCompany,
   includeInstagram:instagram,...(reconnectIntegrationId?{reconnectIntegrationId}:{})}})
  const data=result.data as {url:string}
  const url=new URL(data.url)
  if(url.origin!=='https://www.facebook.com')throw new Error('META_AUTHORIZATION_INVALID')
  window.location.assign(url.toString())
 }
 const complete=async()=>{
  await request('social/meta/complete',{method:'POST',payload:{state,assetIds:selected,relationship}})
  const url=new URL(window.location.href);url.searchParams.delete('metaState');url.searchParams.delete('metaError')
  window.history.replaceState(null,'',url);setState('');setCandidates([]);setSelected([]);await reload();setNotice(true)
 }
 const disconnect=async(id:string)=>{
  if(!window.confirm(t('meta.disconnectConfirm')))return
  await request('social/meta/revoke',{method:'POST',payload:{integrationId:id}});await reload()
 }
 const cancelSelection=()=>{
  const url=new URL(window.location.href);url.searchParams.delete('metaState');url.searchParams.delete('metaError')
  window.history.replaceState(null,'',url);setState('');setCandidates([]);setSelected([]);setError('');setSearch('')
 }
 const visibleCandidates=candidates.filter(a=>`${a.display_name} ${a.external_id}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
 if(!canManage)return <section className={s.panel}><h2>{t('salesNative.social')}</h2>
  <p>{t('salesNative.socialConnectionSettingsAreAvailableToSalesAdministrators')}</p></section>
 return <section className={`${s.panel} ${ui.connections}`} aria-busy={busy || loading}>
  <header className={ui.provider}>
   <span className={ui.providerMark} aria-hidden="true">∞</span>
   <div><h2>{t('meta.integrationTitle')}</h2><p>{t('meta.providerDescription')}</p>
    <span className={ui.badge}>{t('meta.facebookPages')}</span> <span className={ui.badge}>{t('meta.instagramAccounts')}</span>
   </div>
  </header>
  <p>{t('meta.connectionOnly')}</p>
  {loading && <p role="status">{t('salesNative.loadingConnections')}</p>}
  {error && <p role="alert">{t(error==='META_ASSET_ALREADY_RESERVED'?'meta.assetReserved':error==='META_COMPANY_ACCESS_DENIED'?'meta.companyAccessRequired':error==='META_GRANT_UNAVAILABLE'?'meta.selectionExpired':error==='META_PERMISSION_UNAVAILABLE'?'meta.permissionDeclined':'meta.actionError')}</p>}
  {notice && <p role="status">{t('meta.connectionSaved')}</p>}
  {manageCompanies && snapshot.canManage && <MetaCompanyOnboarding request={request} disabled={busy || !!state} onChanged={async()=>{await reload();setCompany('');setError('')}} />}
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
   {state && <fieldset disabled={busy || discovering}>
    <legend>{t('meta.selectAssets')}</legend>
    <p>{t('meta.selectionContext')}</p>
    <p>{t('meta.company')}: <strong>{snapshot.companies.find(c=>c.code===company)?.name}</strong></p>
    {discovering && <p role="status">{t('meta.discovering')}</p>}
    {!discovering && !candidates.length && <p>{t('meta.noAssets')}</p>}
    <label>{t('meta.searchAssets')} <input type="search" value={search} onChange={e=>setSearch(e.target.value)} /></label>
    <p aria-live="polite">{t('meta.selectedCount')}: {selected.length} / 100</p>
    <div className={ui.assetGrid}>{visibleCandidates.map(a=><label key={a.id} className={s.item}>
     <input type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,a.id]:ids.filter(id=>id!==a.id))}/>
     <span>{a.display_name} · {a.asset_type} · {a.external_id}<small>{t('meta.reportedBusiness')}: {a.reported_business_id || t('meta.unknownOwner')}</small></span>
    </label>)}</div>
    <label>{t('meta.relationship')} <select value={relationship} onChange={e=>setRelationship(e.target.value)}>
     <option value="">{t('meta.chooseRelationship')}</option>
     <option value="OWNER_ASSERTED">{t('meta.ownerAsserted')}</option><option value="AGENCY_DELEGATED">{t('meta.agencyDelegated')}</option>
    </select></label>
    <p>{t('meta.ownershipNotice')}</p>
    <button type="button" disabled={!relationship || !selected.length || selected.length>100} onClick={()=>void action(complete)}>{t('meta.saveAssets')}</button>
   </fieldset>}
   {!state && <h3 className={ui.listHeading}>{t('meta.connectedAccounts')} · {snapshot.integrations.filter(i=>!company || i.company_code===company).length}</h3>}
   {!state && !snapshot.integrations.some(i=>!company || i.company_code===company) && <p>{t('meta.noConnections')}</p>}
   <div className={ui.connectionGrid}>{snapshot.integrations.filter(i=>!company || i.company_code===company).map(i=><article key={i.id} className={ui.card}>
    <h3>{snapshot.companies.find(c=>c.code===i.company_code)?.name} · Meta</h3>
    <p>{t('meta.connectionStatus')}: {status(i.status==='REVOKED'?'LOCAL_DISABLED':i.status)} · {i.grant?status(i.grant.status):t('meta.state.unknown')}</p>
    <p>{t('meta.permissions')}: {i.granted_permissions.join(', ') || t('meta.none')}</p>
    <p>{t('meta.authorizer')}: {i.grant?.authorizer_name || t('meta.recordedMember')}</p>
    {i.grant?.meta_user_id && <p>{t('meta.metaIdentity')}: {i.grant.meta_user_id}</p>}
    <p>{t('meta.expires')}: {i.grant?new Date(i.grant.expires_at).toLocaleString():'—'}</p>
    <p>{t('meta.healthCheck')}: {i.grant?.checked_at ? new Date(i.grant.checked_at).toLocaleString() : t('meta.notChecked')} · {i.grant?.health_error ? status(i.grant.health_error) : '—'}</p>
    <p>{t('meta.providerStatus')}: {status(i.provider_cleanup)}</p>
    {i.provider_cleanup!=='CONFIRMED' && i.status==='REVOKED' && <p>{t('meta.cleanupRequired')}</p>}
    {i.grant?.status!=='ACTIVE' && i.status!=='REVOKED' && <p>{t('meta.reconnectRequired')}</p>}
    <ul>{snapshot.assets.filter(a=>a.integrationId===i.id).map(a=><li key={a.id}>{a.display_name} · {a.asset_type} · {a.external_asset_id} · {status(a.relationship)} · {status(a.status)}<br/>{t('meta.reportedBusiness')}: {a.reported_business_id || t('meta.unknownOwner')}</li>)}</ul>
    <button type="button" disabled={busy || !snapshot.metaAvailable || i.grant?.status!=='ACTIVE'} onClick={()=>void action(async()=>{await request('social/meta/health',{method:'POST',payload:{integrationId:i.id}});await reload()})}>{t('meta.healthCheck')}</button>
    <button type="button" disabled={busy || !!state || !snapshot.metaAvailable} onClick={()=>void action(()=>start(i.id,i.company_code))}>{t('meta.reconnect')}</button>
    <button type="button" disabled={busy || i.status==='REVOKED'} onClick={()=>void action(()=>disconnect(i.id))}>{t('meta.localDisconnect')}</button>
   </article>)}</div>
  </>}
  {state && <button type="button" disabled={busy || discovering} onClick={cancelSelection}>{t('meta.cancelSelection')}</button>}
 </section>
}
