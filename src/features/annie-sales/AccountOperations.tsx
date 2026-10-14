'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import s from './LeadOperations.module.css'

export type Account = Record<string, unknown> & {
  id: string; organizationId: string; version: number; name?: string; type?: string
  archivedAt?: string | null; access?: { canEdit?: boolean }
}
type History = { id: string; action?: string; eventType?: string; occurredAt?: string; actorId?: string; changes?: unknown }
type Link = { accountId: string; contactId: string; active: boolean; role?: string | null; organizationId: string; contact?: { displayName?: string } }
type Opportunity = { id: string; name?: string; title?: string; organizationId: string; accountId?: string }
const fields = [
  ['name', 'Name'], ['tradeName', 'Trade name'], ['industry', 'Industry'],
  ['website', 'Website'], ['phone', 'Phone'], ['email', 'Email'], ['description', 'Notes'],
] as const

export default function AccountOperations({ selected, writeEnabled, onChanged }: {
  selected: Account | null; writeEnabled: boolean; onChanged: (id: string) => void
}) {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<History[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function api(path: string, method = 'GET', body?: object, version?: number) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session required')
    const response = await fetch(`/api/integrations/annie/sales/${path}`, {
      method, cache: 'no-store', headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(version ? { 'X-Annie-Expected-Version': String(version) } : {}),
      }, body: body ? JSON.stringify(body) : undefined,
    })
    let result: { data?: unknown; code?: string; details?: unknown }
    try { result = await response.json() } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
    if (!response.ok) {
      const details = Array.isArray(result.details) ? result.details.map(issue =>
        issue && typeof issue === 'object' ? `${(issue as { field?: string }).field ?? 'Field'}: ${(issue as { message?: string }).message ?? 'invalid'}` : '').filter(Boolean).join('; ') : ''
      throw new Error([result.code ?? 'ANNIE_REQUEST_FAILED', details].filter(Boolean).join(' · '))
    }
    return result
  }
  useEffect(() => {
    setHistory([]); setLinks([]); setOpportunities([]); setMode(null); setError(''); setNotice('')
    if (!selected) return
    let cancelled = false
    void Promise.all([
      api(`accounts/${selected.id}/history?limit=25`),
      api(`accounts/${selected.id}/contacts`),
      api(`opportunities?accountId=${selected.id}&limit=100`),
    ]).then(([historyResult, linkResult, opportunityResult]) => {
      if (cancelled) return
      setHistory(Array.isArray(historyResult.data) ? historyResult.data as History[] : [])
      setLinks(Array.isArray(linkResult.data) ? linkResult.data as Link[] : [])
      setOpportunities(Array.isArray(opportunityResult.data) ? opportunityResult.data as Opportunity[] : [])
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'RELATIONSHIP_READ_FAILED') })
    return () => { cancelled = true }
  }, [selected?.id, selected?.version]) // eslint-disable-line react-hooks/exhaustive-deps

  function open(value: 'create' | 'edit') {
    setMode(value); setError(''); setNotice('')
    setDraft(Object.fromEntries([...fields.map(([key]) => [key, value === 'edit' && typeof selected?.[key] === 'string' ? selected[key] : '']),
      ['type', value === 'edit' && typeof selected?.type === 'string' ? selected.type : 'prospect']]) as Record<string, string>)
  }
  async function submit(action: () => Promise<{ data?: unknown }>, message: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await action()
      const id = (result.data as { id?: string } | undefined)?.id ?? selected?.id
      setMode(null); setNotice(message)
      if (id) onChanged(id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'ANNIE_REQUEST_FAILED'
      setError(/ANNIE_UNAVAILABLE|ANNIE_INVALID_RESPONSE|ANNIE_UPSTREAM_ERROR/.test(message)
        ? `${message}. The write outcome is uncertain. Refresh ANNIE history before retrying.` : message)
    } finally { setBusy(false) }
  }
  function save(event: React.FormEvent) {
    event.preventDefault()
    const body: Record<string, unknown> = {}
    for (const [key] of fields) {
      const value = (draft[key] ?? '').trim()
      if (mode === 'edit' && value === (selected?.[key] ?? '')) continue
      if (key === 'name') body.name = value
      else if (value || mode === 'edit') body[key] = value || null
    }
    if (mode === 'create' || draft.type !== selected?.type) body.type = draft.type
    if (mode === 'create') { void submit(() => api('accounts', 'POST', body), 'Synthetic Account created in ANNIE.'); return }
    if (selected && Object.keys(body).length) void submit(() => api(`accounts/${selected.id}`, 'PATCH', body, selected.version), 'Synthetic Account updated in ANNIE.')
  }
  function archive() {
    if (!selected || !reason.trim()) return
    void submit(() => api(`accounts/${selected.id}/archive`, 'POST', {
      reason: reason.trim(), restore: Boolean(selected.archivedAt),
    }, selected.version), selected.archivedAt ? 'Synthetic Account restored in ANNIE.' : 'Synthetic Account archived in ANNIE.')
  }
  const canEdit = writeEnabled && (!selected || selected.access?.canEdit === true)
  return <div className={s.workspace}>
    {writeEnabled && <button type="button" className={s.action} onClick={() => open('create')}>Create synthetic Account</button>}
    {selected && <section className={s.panel} aria-label="Account operations">
      <h3>{selected.name ?? 'Account'} · ANNIE</h3>
      <p>Version {selected.version} · {selected.id}</p>
      <button type="button" disabled={busy} onClick={() => onChanged(selected.id)}>Refresh from ANNIE</button>
      {canEdit && !selected.archivedAt && selected.name?.startsWith('QA PHASE C ') &&
        <button type="button" onClick={() => open('edit')}>Edit synthetic Account</button>}
      {canEdit && selected.name?.startsWith('QA PHASE C ') && <details><summary>{selected.archivedAt ? 'Restore Account' : 'Archive Account'}</summary>
        <label>Reason <input value={reason} onChange={event => setReason(event.target.value)} /></label>
        <button type="button" disabled={busy || !reason.trim()} onClick={archive}>{selected.archivedAt ? 'Restore' : 'Archive'} in ANNIE</button>
      </details>}
      <details open><summary>ANNIE Contact relationships</summary>
        {links.length ? <ul>{links.map(link => <li key={link.contactId}>{link.active ? 'Active' : 'Inactive'} · {link.contact?.displayName ?? 'Contact'} · {link.contactId}</li>)}</ul>
          : <p>No Account–Contact links returned.</p>}
      </details>
      <details open><summary>ANNIE Opportunities for this Account</summary>
        {opportunities.length ? <ul>{opportunities.map(row => <li key={row.id}>{row.name ?? row.title ?? 'Opportunity'} · {row.id}</li>)}</ul>
          : <p>No Opportunities returned.</p>}
      </details>
      <details open><summary>ANNIE history</summary>
        {history.length ? <ul>{history.map(event => <li key={event.id}><strong>{event.action ?? event.eventType ?? 'Change'}</strong> · {event.occurredAt ?? ''}<br />Actor {event.actorId ?? '—'}{event.changes != null && <pre>{JSON.stringify(event.changes, null, 2)}</pre>}</li>)}</ul>
          : <p>No history returned.</p>}
      </details>
    </section>}
    {mode && <section className={s.panel}><h3>{mode === 'create' ? 'Create synthetic Account' : 'Edit synthetic Account'}</h3>
      <form className={s.form} onSubmit={save}>
        {fields.map(([key, label]) => <label key={key}>{label}{key === 'description' ? <textarea value={draft[key] ?? ''} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} /> :
          <input type={key === 'email' ? 'email' : key === 'website' ? 'url' : 'text'} required={key === 'name'} value={draft[key] ?? ''} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} />}</label>)}
        <label>Type <select value={draft.type ?? 'prospect'} onChange={event => setDraft(value => ({ ...value, type: event.target.value }))}>
          <option value="prospect">Prospect</option><option value="customer">Customer</option><option value="partner">Partner</option>
        </select></label>
        <div className={s.actions}><button type="submit" disabled={busy || !draft.name?.startsWith('QA PHASE C ')}>Save in ANNIE</button><button type="button" onClick={() => setMode(null)}>Cancel</button></div>
      </form>
    </section>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>
}
