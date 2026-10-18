'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import s from './SalesModule.module.css'

type Subject = { id: string; displayName?: string; email?: string; access?: { canEdit?: boolean } }
type Message = { id: string; purpose: string; subject: string; recipient: string; status: string;
  createdAt?: string; sentAt?: string | null; failedAt?: string | null; lastErrorCode?: string | null }
const qaRecipient = 'freddy@stratix360.com'

export default function SalesEmail({ resource, selected, enabled }: {
  resource: 'leads' | 'contacts'; selected: Subject; enabled: boolean
}) {
  const key = useRef('')
  const [rows, setRows] = useState<Message[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [draftId, setDraftId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function request(path: string, method = 'GET', payload?: object, idempotencyKey?: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session required')
    const response = await fetch(`/api/integrations/annie/sales/email${path}`, {
      method, cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    let result: { data?: Message | Message[]; code?: string }
    try { result = await response.json() } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
    if (!response.ok) throw new Error(result.code ?? 'EMAIL_REQUEST_FAILED')
    return result
  }
  async function reload() {
    try {
      const query = new URLSearchParams({ subjectType: resource, subjectId: selected.id })
      const result = await request(`?${query}`)
      setRows(Array.isArray(result.data) ? result.data.filter(row => row.purpose === 'individual') : [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'EMAIL_HISTORY_UNAVAILABLE') }
  }
  useEffect(() => { setRows([]); setSubject(''); setBody(''); setDraftId(''); key.current = ''; void reload() }, [resource, selected.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!enabled || !subject.trim() || !body.trim()) return
    setBusy(true); setError(''); setNotice('')
    try {
      let id = draftId
      if (!id) {
        if (!key.current) key.current = crypto.randomUUID()
        const created = await request('', 'POST', { subjectType: resource, subjectId: selected.id,
          recipient: qaRecipient, subject: subject.trim(), bodyText: body.trim() }, key.current)
        id = Array.isArray(created.data) ? '' : created.data?.id ?? ''
        if (!id) throw new Error('ANNIE_INVALID_RESPONSE')
        setDraftId(id)
      }
      await request(`/${id}/queue`, 'POST', { subjectType: resource, subjectId: selected.id })
      setNotice('ANNIE queued the controlled email. Delivery status appears below.')
      setDraftId(''); setSubject(''); setBody(''); key.current = ''
      await reload()
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'EMAIL_REQUEST_FAILED'}. Check delivery history before retrying.`)
      await reload()
    } finally { setBusy(false) }
  }
  const canCompose = enabled && selected.displayName?.startsWith('QA PHASE C ') === true &&
    selected.access?.canEdit === true && selected.email?.toLowerCase() === qaRecipient
  return <section className={s.card} aria-label="ANNIE individual email">
    <div className={s.cardHeader}><h2>Individual email</h2><button className={s.next} type="button" onClick={() => void reload()}>Refresh delivery status</button></div>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {rows.length ? <ul className={s.list}>{rows.map(row => <li key={row.id}><div><strong>{row.subject}</strong>
      <small>{row.status} · {row.sentAt ?? row.failedAt ?? row.createdAt ?? ''}{row.lastErrorCode ? ` · ${row.lastErrorCode}` : ''}</small>
    </div></li>)}</ul> : <p className={s.muted}>No individual email history for this record.</p>}
    {canCompose && <form className={s.filters} onSubmit={event => void send(event)}>
      <p>Controlled QA recipient: {qaRecipient}. ANNIE consent and delivery guards remain authoritative.</p>
      <label>Subject <input required maxLength={500} disabled={Boolean(draftId)} value={subject} onChange={event => setSubject(event.target.value)} /></label>
      <label>Message <textarea required maxLength={50_000} disabled={Boolean(draftId)} value={body} onChange={event => setBody(event.target.value)} /></label>
      <button className={s.next} type="submit" disabled={busy || (!draftId && (!subject.trim() || !body.trim()))}>
        {draftId ? 'Retry queue in ANNIE' : 'Create and queue in ANNIE'}
      </button>
    </form>}
  </section>
}
