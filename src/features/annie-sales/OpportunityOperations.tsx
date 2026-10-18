'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, type SalesDirectory } from './salesDirectory'
import s from './LeadOperations.module.css'

export type Opportunity = Record<string, unknown> & {
  id: string; organizationId: string; version: number; name?: string; accountId?: string
  accountName?: string; primaryContactId?: string | null; contactName?: string | null
  stageId?: string; amount?: string | number | null; currency?: string; expectedCloseDate?: string
  ownerProfileId?: string; archivedAt?: string | null; access?: { canEdit?: boolean }
}
type Stage = { id: string; code: string; label: string; outcome: string; organizationId: string }
type History = { id: string; action?: string; eventType?: string; occurredAt?: string; actorId?: string; changes?: unknown }
type Link = { id: string; contactId: string; organizationId: string; contact?: { displayName?: string } }
type AccountOption = { id: string; name?: string }
type ContactOption = { id: string; displayName?: string }
const fields = [['name', 'Name'], ['accountId', 'Account'], ['primaryContactId', 'Primary contact'],
  ['currency', 'Currency'], ['amount', 'Amount'], ['expectedCloseDate', 'Expected close date'], ['description', 'Notes']] as const
const datePart = (value: unknown) => typeof value === 'string' ? value.slice(0, 10) : ''

export default function OpportunityOperations({ selected, writeEnabled, onChanged, directory }: {
  selected: Opportunity | null; writeEnabled: boolean; onChanged: (id: string) => void; directory: SalesDirectory
}) {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [stages, setStages] = useState<Stage[]>([])
  const [history, setHistory] = useState<History[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [stageCode, setStageCode] = useState('')
  const [transitionAmount, setTransitionAmount] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [archiveReason, setArchiveReason] = useState('')
  const [stale, setStale] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function api(path: string, method = 'GET', body?: object, version?: number) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session required')
    const response = await fetch(`/api/integrations/annie/sales/${path}`, {
      method, cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(version ? { 'X-Annie-Expected-Version': String(version) } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    let result: { data?: unknown; code?: string; details?: unknown }
    try { result = await response.json() } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
    if (!response.ok) throw new Error(result.code ?? 'ANNIE_REQUEST_FAILED')
    return result
  }

  useEffect(() => {
    let cancelled = false
    void api('pipeline').then(result => {
      if (!cancelled) setStages(((result.data as { stages?: Stage[] })?.stages ?? []))
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'PIPELINE_READ_FAILED') })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!writeEnabled) return
    let cancelled = false
    void Promise.all([api('accounts?limit=100'), api('contacts?limit=100')]).then(([a, c]) => {
      if (!cancelled) {
        setAccounts(Array.isArray(a.data) ? a.data as AccountOption[] : [])
        setContacts(Array.isArray(c.data) ? c.data as ContactOption[] : [])
      }
    }).catch(() => { if (!cancelled) { setAccounts([]); setContacts([]) } })
    return () => { cancelled = true }
  }, [writeEnabled]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setHistory([]); setLinks([]); setMode(null); setError(''); setNotice('')
    if (!selected) return
    let cancelled = false
    void Promise.all([api(`opportunities/${selected.id}/history?limit=50`), api(`opportunities/${selected.id}/contacts`)]).then(([h, l]) => {
      if (!cancelled) { setHistory(Array.isArray(h.data) ? h.data as History[] : []); setLinks(Array.isArray(l.data) ? l.data as Link[] : []) }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'OPPORTUNITY_RELATED_READ_FAILED') })
    return () => { cancelled = true }
  }, [selected?.id, selected?.version]) // eslint-disable-line react-hooks/exhaustive-deps

  function open(value: 'create' | 'edit') {
    setMode(value); setError(''); setNotice('')
    setDraft(Object.fromEntries(fields.map(([key]) => [key, value === 'edit' ?
      key === 'expectedCloseDate' ? datePart(selected?.[key]) : String(selected?.[key] ?? '') :
      key === 'currency' ? 'USD' : ''])))
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
        ? `${message}. The outcome is uncertain; refresh ANNIE history before retrying.` : message)
    } finally { setBusy(false) }
  }
  function save(event: React.FormEvent) {
    event.preventDefault()
    const body: Record<string, unknown> = {}
    for (const [key] of fields) {
      const value = (draft[key] ?? '').trim()
      const previous = key === 'expectedCloseDate' ? datePart(selected?.[key]) : String(selected?.[key] ?? '')
      if (mode === 'edit' && value === previous) continue
      if (key === 'primaryContactId' || key === 'amount' || key === 'description') body[key] = value || null
      else body[key] = value
    }
    if (mode === 'create') { void submit(() => api('opportunities', 'POST', body), 'Synthetic Opportunity created in ANNIE.'); return }
    if (selected && Object.keys(body).length) void submit(() => api(`opportunities/${selected.id}`, 'PATCH', body, selected.version), 'Synthetic Opportunity updated in ANNIE.')
  }
  function transition() {
    if (!selected || !stageCode) return
    const body: Record<string, unknown> = { stageCode }
    if (transitionAmount.trim()) body.amount = transitionAmount.trim()
    if (stageCode === 'LOST') body.lostReason = lostReason.trim()
    if (stageCode === 'WON') body.actualCloseDate = new Date().toISOString().slice(0, 10)
    if (reopenReason.trim()) body.reason = reopenReason.trim()
    void submit(() => api(`opportunities/${selected.id}/transitions`, 'POST', body,
      stale ? Math.max(1, selected.version - 1) : selected.version), 'Opportunity stage changed in ANNIE.')
  }
  function archive() {
    if (!selected || !archiveReason.trim()) return
    void submit(() => api(`opportunities/${selected.id}/archive`, 'POST', {
      reason: archiveReason.trim(), restore: Boolean(selected.archivedAt),
    }, selected.version), selected.archivedAt ? 'Opportunity restored in ANNIE.' : 'Opportunity archived in ANNIE.')
  }
  const synthetic = selected?.name?.startsWith('QA PHASE C ') === true
  const canWrite = writeEnabled && synthetic && selected?.access?.canEdit === true
  const currentStage = stages.find(stage => stage.id === selected?.stageId)
  return <div className={s.workspace}>
    {writeEnabled && <button type="button" className={s.action} onClick={() => open('create')}>Create synthetic Opportunity</button>}
    {selected && <section className={s.panel} aria-label="Opportunity operations">
      <h3>{selected.name ?? 'Opportunity'} · ANNIE</h3>
      <p>Stage {currentStage?.label ?? '—'} · Owner {ownerLabel(directory, selected.ownerProfileId)}</p>
      <p>Account {selected.accountName ?? accounts.find(account => account.id === selected.accountId)?.name ?? '—'}</p>
      <p>Primary Contact {selected.contactName ?? contacts.find(contact => contact.id === selected.primaryContactId)?.displayName ?? '—'}</p>
      <button type="button" disabled={busy} onClick={() => onChanged(selected.id)}>Refresh from ANNIE</button>
      {canWrite && !selected.archivedAt && <button type="button" onClick={() => open('edit')}>Edit synthetic Opportunity</button>}
      {canWrite && !selected.archivedAt && <details><summary>Change stage in ANNIE</summary>
        <label>Next stage <select value={stageCode} onChange={event => setStageCode(event.target.value)}><option value="">Choose stage</option>{stages.map(stage => <option key={stage.id} value={stage.code}>{stage.label}</option>)}</select></label>
        <label>Amount <input value={transitionAmount} onChange={event => setTransitionAmount(event.target.value)} /></label>
        <label>Loss reason <input value={lostReason} onChange={event => setLostReason(event.target.value)} /></label>
        <label>Reopen reason <input value={reopenReason} onChange={event => setReopenReason(event.target.value)} /></label>
        <label>QA: send prior version <input type="checkbox" checked={stale} onChange={event => setStale(event.target.checked)} /></label>
        <button type="button" disabled={busy || !stageCode} onClick={transition}>Send stage transition</button>
      </details>}
      {canWrite && <details><summary>{selected.archivedAt ? 'Restore Opportunity' : 'Archive Opportunity'}</summary>
        <label>Reason <input value={archiveReason} onChange={event => setArchiveReason(event.target.value)} /></label>
        <button type="button" disabled={busy || !archiveReason.trim()} onClick={archive}>{selected.archivedAt ? 'Restore' : 'Archive'} in ANNIE</button>
      </details>}
      <details open><summary>ANNIE Contact links</summary>{links.length ? <ul>{links.map(link => <li key={link.id}>{link.contact?.displayName ?? 'Contact'}</li>)}</ul> : <p>No links returned.</p>}</details>
      <details open><summary>ANNIE history</summary>{history.length ? <ul>{history.map(event => <li key={event.id}><strong>{event.action ?? event.eventType ?? 'Change'}</strong> · {event.occurredAt ?? ''}<br />Actor {ownerLabel(directory, event.actorId)}{event.changes != null && <pre>{JSON.stringify(event.changes, null, 2)}</pre>}</li>)}</ul> : <p>No history returned.</p>}</details>
    </section>}
    {mode && <section className={s.panel}><h3>{mode === 'create' ? 'Create synthetic Opportunity' : 'Edit synthetic Opportunity'}</h3>
      <form className={s.form} onSubmit={save}>{fields.map(([key, label]) => <label key={key}>{label}{key === 'accountId' ? <select required value={draft[key] ?? ''} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))}><option value="">Select account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name ?? 'Account'}</option>)}</select> : key === 'primaryContactId' ? <select value={draft[key] ?? ''} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))}><option value="">No primary contact</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.displayName ?? 'Contact'}</option>)}</select> : key === 'description' ? <textarea value={draft[key] ?? ''} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} /> :
        <input type={key === 'expectedCloseDate' ? 'date' : key === 'amount' ? 'number' : 'text'} step={key === 'amount' ? '0.01' : undefined}
          required={['name', 'accountId', 'currency', 'expectedCloseDate'].includes(key)} value={draft[key] ?? ''}
          onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} />}</label>)}
        <div className={s.actions}><button type="submit" disabled={busy || !draft.name?.startsWith('QA PHASE C ')}>Save in ANNIE</button><button type="button" onClick={() => setMode(null)}>Cancel</button></div>
      </form>
    </section>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>
}
