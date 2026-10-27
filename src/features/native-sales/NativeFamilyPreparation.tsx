'use client'
import {useEffect,useRef,useState} from 'react'
import {useT} from '@/shared/i18n'
import {salesDisplayValue} from './display-value'
import type {NativeRequest} from './NativeSalesModule'
import s from './NativeSalesModule.module.css'
type Prepared={id:string;firstName:string;lastName:string;dateOfBirth:string;relationship:string;reviewStatus:string;updatedAt:string;authorityAttested:boolean}
type Billing={id:string;purpose:string;additionalCount:number;baseCents:number;additionalUnitCents:number;amountCents:number;status:string;invoiceNumber:string|null;invoiceStatus:string|null;paymentStatus:string|null}
type Preparation={intentId:string;purpose:string;status:string;additionalCount:number;baseCents:number;additionalUnitCents:number;amountCents:number;
 approvalReady:boolean;locked:boolean;canReview:boolean;members:Prepared[]}
export default function NativeFamilyPreparation({opportunityId,membershipId,request,onSaved}:{opportunityId?:string;membershipId?:string;request:NativeRequest;onSaved?:()=>void}){
 const {locale,t}=useT()
 const [data,setData]=useState<Preparation|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
 const [history,setHistory]=useState<Billing[]>([])
 const retry=useRef({payload:'',key:''})
 const params=new URLSearchParams(opportunityId?{opportunityId}:membershipId?{membershipId}:{})
 const resource=`patient-family?${params}`
 useEffect(()=>{
  let cancelled=false
  void request(resource).then(result=>{if(!cancelled){setData(result.data as Preparation|null);setHistory(Array.isArray(result.history)?result.history as Billing[]:[]);setError('')}})
   .catch(()=>{if(!cancelled)setError('LOAD')})
  return()=>{cancelled=true}
 },[resource,request,revision])
 async function review(member:Prepared,decision:'APPROVED'|'REJECTED'){
  if(!data)return
  const payload={intentId:data.intentId,memberId:member.id,decision,expectedUpdatedAt:member.updatedAt},serialized=JSON.stringify(payload)
  if(retry.current.payload!==serialized)retry.current={payload:serialized,key:crypto.randomUUID()}
  setBusy(true);setError('')
  try{await request('patient-family',{method:'POST',payload,idempotencyKey:retry.current.key});setRevision(value=>value+1);onSaved?.()}
  catch{setError(t('salesNative.familyTheReviewCouldNotBeSavedRefresh'))}
  finally{setBusy(false)}
 }
 const money=(cents:number)=>new Intl.NumberFormat(locale==='en'?'en-US':'es-US',{style:'currency',currency:'USD'}).format(cents/100)
 if(!data&&!history.length&&!error)return null
 return <section className={s.recordActions} aria-label={t('salesNative.familyFamilyPreparationAndApproval')}>
  <h3>{t('salesNative.familyFamilyPreparationBeforeInvoicing')}</h3>
  {data&&<>
   <p>{t('salesNative.familyIncluded')}: {data.purpose==='FAMILY_ADDITION'?0:3} · {t('salesNative.familyAdditional')}: {data.additionalCount}</p>
   <p>{t('salesNative.familyBase')}: {money(data.baseCents)} · {t('salesNative.familyPerAdditionalPersonForThisPeriod')}: {money(data.additionalUnitCents)} · <strong>{t('salesNative.familyInvoiceTotal')}: {money(data.amountCents)}</strong></p>
   <p>{t('salesNative.familyApprovalAuthorizesInvoicingCoverageAndCodesRequire')}</p>
   <p role="status">{data.locked?t('salesNative.familyDetailsLockedByInvoiceProcessing'):data.approvalReady?t('salesNative.familyPreparationApprovedForInvoicing'):t('salesNative.familyAwaitingCompleteDetailsAndStaffApproval')}</p>
   <ul className={s.scheduleList}>{data.members.map(member=><li key={member.id}><span><strong>{member.firstName} {member.lastName}</strong><small>{member.dateOfBirth} · {salesDisplayValue(member.relationship,t)} · {member.reviewStatus==='APPROVED'?t('salesNative.familyApproved'):member.reviewStatus==='REJECTED'?t('salesNative.familyRejected'):t('salesNative.familyAwaitingApproval')}</small></span>
    {data.canReview&&!data.locked&&<span className={s.pdfActions}>
     <button type="button" disabled={busy||!member.authorityAttested||member.reviewStatus==='APPROVED'} onClick={()=>void review(member,'APPROVED')}>{t('salesNative.familyApproveDetails')}</button>
     <button type="button" disabled={busy||member.reviewStatus==='REJECTED'} onClick={()=>void review(member,'REJECTED')}>{t('salesNative.familyReject')}</button>
    </span>}
   </li>)}</ul>
  </>}
  {history.length>0&&<><h3>{t('salesNative.familyFamilyInvoicesAndPeriods')}</h3><ul className={s.scheduleList}>{history.map(item=><li key={item.id}><span><strong>{item.purpose==='FAMILY_ADDITION'?t('salesNative.familyAdditionalFamilyMembers'):item.purpose==='RENEWAL'?t('salesNative.familyFamilyRenewal'):t('salesNative.familyInitialFamilyMembership')}</strong>
   <small>{t('salesNative.familyAdditional')}: {item.additionalCount} · {t('salesNative.familyBase')}: {money(item.baseCents)} · {t('salesNative.familyPerPerson')}: {money(item.additionalUnitCents)} · {t('salesNative.familyTotal')}: {money(item.amountCents)}</small>
   <small>{item.invoiceNumber??'—'} · {salesDisplayValue(item.invoiceStatus??'—',t)} · {salesDisplayValue(item.paymentStatus??'—',t)}</small></span></li>)}</ul></>}
  {error&&<p role="alert" className={s.error}>{error==='LOAD'?t('salesNative.familyFamilyPreparationCouldNotBeLoaded'):error}</p>}
 </section>
}
