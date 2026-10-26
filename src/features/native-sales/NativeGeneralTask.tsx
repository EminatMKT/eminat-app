'use client'
import { type FormEvent, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

export default function NativeGeneralTask({ request, onSaved }: {
  request: NativeRequest; onSaved: () => void
}) {
  const { t } = useT()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const key = useRef({ payload: '', value: '' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dueDate = dueAt ? new Date(dueAt) : null
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      setError('Enter a valid due date and time.')
      return
    }
    const payload: Record<string, unknown> = {
      resource: 'general', kind: 'TASK', title: title.trim(),
      ...(body.trim() ? { body: body.trim() } : {}),
      ...(dueDate ? { dueAt: dueDate.toISOString() } : {}),
    }
    const serialized = JSON.stringify(payload)
    if (key.current.payload !== serialized)
      key.current = { payload: serialized, value: crypto.randomUUID() }
    setBusy(true); setError('')
    try {
      await request('activities', { method: 'POST', payload, idempotencyKey: key.current.value })
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'TASK_SAVE_FAILED') }
    finally { setBusy(false) }
  }

  return <form className={`${s.panel} ${s.form}`} onSubmit={event => void submit(event)}>
    <h2>{t('salesNative.newGeneralTask')}</h2>
    <p className={s.hint}>{t('salesNative.thisTaskIsAssignedToYouAndDoes')}</p>
    <label>{t('salesNative.auditTitle')} <input required maxLength={240} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label>{t('salesNative.auditDetails')} <textarea maxLength={20000} value={body} onChange={event => setBody(event.target.value)} /></label>
    <label>{t('salesNative.auditDueDateAndTime')} <input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} /></label>
    {error && <p role="alert" className={s.error}>{error}</p>}
    <button type="submit" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save task'}</button>
  </form>
}
