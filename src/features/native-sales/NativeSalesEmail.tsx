'use client'

import { type FormEvent, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

export default function NativeSalesEmail({resource,recordId,recipient,request,onSent}:{
  resource:'leads'|'contacts'|'accounts';recordId:string;recipient:string;
  request:NativeRequest;onSent:()=>void
}) {
  const { t } = useT()
  const [subject,setSubject]=useState('')
  const [body,setBody]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState(false)
  const key=useRef({payload:'',value:''})

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload={resource,recordId,subject:subject.trim(),body:body.trim()}
    const serialized=JSON.stringify(payload)
    if (key.current.payload!==serialized) key.current={payload:serialized,value:crypto.randomUUID()}
    setBusy(true);setError('');setSuccess(false)
    try {
      const result=await request('email',{method:'POST',payload,idempotencyKey:key.current.value})
      const status=(result.data as {status?:string}|undefined)?.status
      if (status!=='SENT') throw new Error('SALES_EMAIL_OUTCOME_UNKNOWN')
      setSuccess(true);onSent()
    } catch(cause) {setError(cause instanceof Error ? cause.message : 'SALES_EMAIL_FAILED')}
    finally {setBusy(false)}
  }

  return <section className={s.recordActions} aria-label={t('salesNative.commercialEmail')}>
    <h3>{t('salesNative.email')}</h3>
    <p>Recipient: {recipient}. Delivery is controlled by the configured Sales email gate.</p>
    <form className={s.form} onSubmit={event => void submit(event)}>
      <label>Subject <input required maxLength={240} value={subject} onChange={event => setSubject(event.target.value)} /></label>
      <label>Message <textarea required maxLength={20000} value={body} onChange={event => setBody(event.target.value)} /></label>
      <button type="submit" disabled={busy || !subject.trim() || !body.trim()}>{busy ? 'Sending…' : 'Send email'}</button>
    </form>
    {success && <p role="status">{t('salesNative.emailAcceptedByTheDeliveryProviderAndRecorded')}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
