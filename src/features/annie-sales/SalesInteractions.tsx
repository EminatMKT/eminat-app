'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, type SalesDirectory } from './salesDirectory'
import s from './SalesModule.module.css'

type Resource = 'leads' | 'contacts' | 'accounts' | 'opportunities'
type Selected = { id: string; version?: number; displayName?: string; name?: string; access?: { canEdit?: boolean } }
type Interaction = { id: string; kind: string; body: string; authorId?: string; occurredAt: string; durationMinutes?: number | null }
const kinds = [
  ['note', 'Note'], ['call', 'Call'], ['call_no_answer', 'Call, no answer'],
  ['email_manual', 'Email logged'], ['whatsapp', 'WhatsApp logged'],
] as const

export default function SalesInteractions({ resource, selected, directory, writeEnabled, syntheticOnly, onChanged }: {
  resource: Resource; selected: Selected; directory: SalesDirectory; writeEnabled: boolean; syntheticOnly: boolean; onChanged: (id: string) => void
}) {
  const [rows, setRows] = useState<Interaction[]>([])
  const [kind, setKind] = useState<(typeof kinds)[number][0]>('note')
  const [body, setBody] = useState('')
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function request(method = 'GET', payload?: object) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session required')
    const response = await fetch(`/api/integrations/annie/sales/interactions/${resource}/${selected.id}`, {
      method, cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
        ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    let result: { data?: Interaction[] | Interaction; code?: string }
    try { result = await response.json() } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
    if (!response.ok) throw new Error(result.code ?? 'INTERACTIONS_UNAVAILABLE')
    return result
  }
  async function reload() {
    setLoading(true); setError('')
    try { const result = await request(); setRows(Array.isArray(result.data) ? result.data : []) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'INTERACTIONS_UNAVAILABLE') }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [selected.id, selected.version, resource]) // eslint-disable-line react-hooks/exhaustive-deps
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    setBusy(true); setError(''); setNotice('')
    try {
      await request('POST', { kind, body: body.trim(), occurredAt: new Date().toISOString(),
        ...(duration ? { durationMinutes: Number(duration) } : {}) })
      setBody(''); setDuration(''); setNotice('Interaction saved in ANNIE.'); await reload(); onChanged(selected.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'INTERACTION_FAILED') }
    finally { setBusy(false) }
  }
  const synthetic = (selected.displayName ?? selected.name ?? '').startsWith('QA PHASE C ')
  return <section className={s.card} aria-label="ANNIE interactions">
    <div className={s.cardHeader}><h2>Notes and interactions</h2><button className={s.next} type="button" disabled={loading || busy} onClick={() => void reload()}>Refresh</button></div>
    {loading && <p role="status">Loading ANNIE interactions…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!loading && (rows.length ? <ul className={s.list}>{rows.map(row => <li key={row.id}><div>
      <strong>{kinds.find(item => item[0] === row.kind)?.[1] ?? 'Interaction'}</strong><p>{row.body}</p>
      <small>{new Date(row.occurredAt).toLocaleString()} · {ownerLabel(directory, row.authorId)}{row.durationMinutes ? ` · ${row.durationMinutes} min` : ''}</small>
    </div></li>)}</ul> : <p className={s.muted}>No interactions recorded.</p>)}
    {writeEnabled && (!syntheticOnly || synthetic) && selected.access?.canEdit === true && <form className={s.filters} onSubmit={event => void save(event)}>
      <label>Type <select value={kind} onChange={event => setKind(event.target.value as typeof kind)}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Notes <textarea required maxLength={10_000} value={body} onChange={event => setBody(event.target.value)} /></label>
      {(kind === 'call' || kind === 'call_no_answer') && <label>Minutes <input type="number" min="1" max="1440" value={duration} onChange={event => setDuration(event.target.value)} /></label>}
      <button className={s.next} type="submit" disabled={busy || !body.trim()}>Save interaction in ANNIE</button>
    </form>}
  </section>
}
