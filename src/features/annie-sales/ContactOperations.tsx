'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, roleLabel, teamLabel, type SalesDirectory } from './salesDirectory'
import s from './LeadOperations.module.css'

export type Contact = Record<string, unknown> & {
  id: string; organizationId: string; version: number; displayName?: string
  primaryAccountId?: string | null; archivedAt?: string | null
  access?: { canEdit?: boolean }
}
type History = { id: string; action?: string; eventType?: string; occurredAt?: string; actorId?: string; changes?: unknown }
type Account = { id: string; name?: string; organizationId: string; version: number }
type AccountLink = { accountId: string; contactId: string; active: boolean; organizationId: string }
type RelatedLead = { id: string; displayName?: string; organizationId: string }
type Field = { key: string; label: string; type?: 'text' | 'email' | 'date' | 'datetime-local' | 'textarea' | 'checkbox' | 'owner' | 'team' | 'account'; required?: boolean }
const fields: Field[] = [
  { key: 'displayName', label: 'Display name', required: true },
  { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' },
  { key: 'title', label: 'Job title' }, { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' }, { key: 'primaryAccountId', label: 'Primary ANNIE account', type: 'account' },
  { key: 'product', label: 'Product' }, { key: 'plan', label: 'Plan' },
  { key: 'insurance', label: 'Insurance' }, { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'nextAction', label: 'Next action' }, { key: 'nextFollowUpAt', label: 'Next follow-up', type: 'datetime-local' },
  { key: 'description', label: 'Notes', type: 'textarea' },
  { key: 'address.street', label: 'Street' }, { key: 'address.city', label: 'City' },
  { key: 'address.state', label: 'State' }, { key: 'address.postalCode', label: 'Postal code' },
  { key: 'address.country', label: 'Country' },
  { key: 'corazonSalud', label: 'Corazón Salud', type: 'checkbox' },
  { key: 'doNotCall', label: 'Do not call', type: 'checkbox' },
  { key: 'doNotEmail', label: 'Do not email', type: 'checkbox' },
  { key: 'ownerProfileId', label: 'ANNIE owner', type: 'owner' },
  { key: 'teamId', label: 'ANNIE team', type: 'team' },
]
function valueOf(row: Contact | null, key: string): string | boolean {
  const value = key.includes('.') ? (row?.[key.split('.')[0]] as Record<string, unknown> | null)?.[key.split('.')[1]] : row?.[key]
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return ''
  if (key === 'nextFollowUpAt') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  return value
}
function payloadFrom(draft: Record<string, string | boolean>, selected: Contact | null) {
  const output: Record<string, unknown> = {}
  const address: Record<string, string | null> = {}
  for (const field of fields) {
    const value = draft[field.key]
    if (value === undefined || (selected && value === valueOf(selected, field.key))) continue
    if (!selected && !field.required && (value === '' || value === false)) continue
    if (field.key.startsWith('address.')) { address[field.key.slice(8)] = String(value).trim() || null; continue }
    if (field.type === 'checkbox') { output[field.key] = Boolean(value); continue }
    if (field.type === 'datetime-local') { output[field.key] = value ? new Date(String(value)).toISOString() : null; continue }
    if (field.type === 'owner' && value === '') continue
    if (field.required) { output[field.key] = String(value).trim(); continue }
    output[field.key] = String(value).trim() || null
  }
  if (Object.keys(address).length) {
    const old = selected?.address && typeof selected.address === 'object' ? selected.address as Record<string, unknown> : {}
    output.address = { ...old, ...address }
  }
  return output
}

export default function ContactOperations({ selected, writeEnabled, onChanged }: {
  selected: Contact | null; writeEnabled: boolean; onChanged: (id: string) => void
}) {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [draft, setDraft] = useState<Record<string, string | boolean>>({})
  const [history, setHistory] = useState<History[]>([])
  const [historyNext, setHistoryNext] = useState<string | null>(null)
  const [directory, setDirectory] = useState<SalesDirectory>({})
  const [accounts, setAccounts] = useState<Account[]>([])
  const [relationshipAccountId, setRelationshipAccountId] = useState('')
  const [accountLinks, setAccountLinks] = useState<AccountLink[]>([])
  const [relationshipError, setRelationshipError] = useState('')
  const [relatedLeads, setRelatedLeads] = useState<RelatedLead[]>([])
  const [relatedNext, setRelatedNext] = useState<string | null>(null)
  const [relatedError, setRelatedError] = useState('')
  const [archiveReason, setArchiveReason] = useState('')
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
    let result: { data?: unknown; code?: string; details?: unknown; nextCursor?: string | null }
    try { result = await response.json() } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
    if (!response.ok) {
      const details = Array.isArray(result.details) ? result.details
        .map(issue => issue && typeof issue === 'object' ? `${(issue as { field?: string }).field ?? 'Field'}: ${(issue as { message?: string }).message ?? 'invalid'}` : '')
        .filter(Boolean).join('; ') : ''
      throw new Error([result.code ?? 'ANNIE_REQUEST_FAILED', details].filter(Boolean).join(' · '))
    }
    return result
  }
  useEffect(() => {
    setHistory([]); setHistoryNext(null); setRelatedLeads([]); setRelatedNext(null); setRelatedError(''); setMode(null); setError(''); setNotice('')
    setRelationshipAccountId(selected?.primaryAccountId ?? ''); setAccountLinks([]); setRelationshipError('')
    if (!selected) return
    let cancelled = false
    void api(`contacts/${selected.id}/history?limit=25`).then(result => {
      if (!cancelled) { setHistory(Array.isArray(result.data) ? result.data as History[] : []); setHistoryNext(result.nextCursor ?? null) }
    }).catch(() => { if (!cancelled) setHistory([]) })
    void api(`contacts/${selected.id}/leads`).then(result => {
      if (!cancelled) { setRelatedLeads(Array.isArray(result.data) ? result.data as RelatedLead[] : []); setRelatedNext(result.nextCursor ?? null) }
    }).catch(cause => { if (!cancelled) setRelatedError(cause instanceof Error ? cause.message : 'RELATIONSHIP_READ_FAILED') })
    return () => { cancelled = true }
  }, [selected?.id, selected?.version]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!writeEnabled) return
    let cancelled = false
    void Promise.all([api('directory'), api('accounts?limit=100')]).then(([directoryResult, accountResult]) => {
      if (!cancelled) {
        setDirectory(directoryResult.data as SalesDirectory ?? {})
        setAccounts(Array.isArray(accountResult.data) ? accountResult.data as Account[] : [])
      }
    }).catch(() => { if (!cancelled) { setDirectory({}); setAccounts([]) } })
    return () => { cancelled = true }
  }, [writeEnabled]) // eslint-disable-line react-hooks/exhaustive-deps
  function open(value: 'create' | 'edit') {
    setMode(value); setError(''); setNotice('')
    setDraft(Object.fromEntries(fields.map(field => [field.key, valueOf(value === 'edit' ? selected : null, field.key)])))
  }
  async function submit(action: () => Promise<{ data?: unknown }>, message: string, contactId?: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await action()
      const id = contactId ?? (result.data as { id?: string } | undefined)?.id ?? selected?.id
      setMode(null); setNotice(message)
      if (id) onChanged(id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'ANNIE_REQUEST_FAILED'
      setError(/ANNIE_UNAVAILABLE|ANNIE_INVALID_RESPONSE|ANNIE_UPSTREAM_ERROR/.test(message)
        ? `${message}. The write outcome is uncertain. Refresh ANNIE history and search before retrying.` : message)
    } finally { setBusy(false) }
  }
  function save(event: React.FormEvent) {
    event.preventDefault()
    const body = payloadFrom(draft, mode === 'edit' ? selected : null)
    if (mode === 'create') { void submit(() => api('contacts', 'POST', body), 'Contact created in ANNIE.'); return }
    if (selected) void submit(() => api(`contacts/${selected.id}`, 'PATCH', body, selected.version), 'Contact updated in ANNIE.')
  }
  function archive() {
    if (!selected || !archiveReason.trim()) return
    void submit(() => api(`contacts/${selected.id}/archive`, 'POST', {
      reason: archiveReason.trim(), restore: Boolean(selected.archivedAt),
    }, selected.version), selected.archivedAt ? 'Contact restored in ANNIE.' : 'Contact archived in ANNIE.')
  }
  async function loadAccountLinks(accountId: string) {
    setRelationshipAccountId(accountId); setAccountLinks([]); setRelationshipError('')
    if (!accountId) return
    try {
      const result = await api(`accounts/${accountId}/contacts`)
      setAccountLinks(Array.isArray(result.data) ? result.data as AccountLink[] : [])
    } catch (cause) { setRelationshipError(cause instanceof Error ? cause.message : 'RELATIONSHIP_READ_FAILED') }
  }
  async function deactivateAccountLink() {
    if (!selected || !relationshipAccountId || selected.primaryAccountId === relationshipAccountId) return
    const account = accounts.find(row => row.id === relationshipAccountId)
    if (!account?.version || !accountLinks.some(link => link.contactId === selected.id && link.active)) return
    setBusy(true); setRelationshipError(''); setNotice('')
    try {
      await api(`accounts/${account.id}/contacts`, 'POST', { contactId: selected.id, active: false }, account.version)
      const [linksResult, accountResult] = await Promise.all([
        api(`accounts/${account.id}/contacts`), api(`accounts/${account.id}`),
      ])
      setAccountLinks(Array.isArray(linksResult.data) ? linksResult.data as AccountLink[] : [])
      const updated = accountResult.data as Account
      setAccounts(current => current.map(row => row.id === updated.id ? updated : row))
      setNotice('Account relationship deactivated in ANNIE. Contact archive can now be retried.')
    } catch (cause) {
      setRelationshipError(cause instanceof Error ? cause.message : 'RELATIONSHIP_WRITE_FAILED')
    } finally { setBusy(false) }
  }
  async function moreHistory() {
    if (!selected || !historyNext) return
    try {
      const result = await api(`contacts/${selected.id}/history?limit=25&cursor=${historyNext}`)
      setHistory(current => [...current, ...(Array.isArray(result.data) ? result.data as History[] : [])])
      setHistoryNext(result.nextCursor ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'HISTORY_FAILED') }
  }
  async function moreRelated() {
    if (!selected || !relatedNext) return
    try {
      const result = await api(`contacts/${selected.id}/leads?cursor=${relatedNext}`)
      setRelatedLeads(current => [...current, ...(Array.isArray(result.data) ? result.data as RelatedLead[] : [])])
      setRelatedNext(result.nextCursor ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'RELATIONSHIP_READ_FAILED') }
  }
  const canEdit = writeEnabled && (!selected || selected.access?.canEdit === true)
  return <div className={s.workspace}>
    {writeEnabled && <button type="button" className={s.action} onClick={() => open('create')}>Create Contact</button>}
    {selected && <section className={s.panel} aria-label="Contact operations">
      <h3>{selected.displayName ?? 'Contact'} · ANNIE</h3>
      <p>Primary account: {accounts.find(account => account.id === selected.primaryAccountId)?.name ?? (selected.primaryAccountId ? 'Account' : '—')}</p>
      <button type="button" disabled={busy} onClick={() => onChanged(selected.id)}>Refresh from ANNIE</button>
      {canEdit && !selected.archivedAt && <button type="button" onClick={() => open('edit')}>Edit Contact</button>}
      {writeEnabled && !selected.archivedAt && <details><summary>ANNIE Account relationship</summary>
        <p>ANNIE requires active Account links to be deactivated before this Contact can be archived.</p>
        <label>Account
          <select value={relationshipAccountId} onChange={event => void loadAccountLinks(event.target.value)}>
            <option value="">Select an ANNIE Account</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name ?? 'Account'}</option>)}
          </select>
        </label>
        {relationshipAccountId && <button type="button" disabled={busy} onClick={() => void loadAccountLinks(relationshipAccountId)}>Refresh relationship</button>}
        {accountLinks.filter(link => link.contactId === selected.id).map(link => <p key={`${link.accountId}:${link.contactId}`}>
          {link.active ? 'Active' : 'Inactive'} Account–Contact link · {accounts.find(account => account.id === link.accountId)?.name ?? 'Account'}
        </p>)}
        {relationshipAccountId && accountLinks.some(link => link.contactId === selected.id && link.active) &&
          (selected.primaryAccountId === relationshipAccountId
            ? <p>Clear the primary Account in Edit Contact before deactivating this link.</p>
            : canEdit && <button type="button" disabled={busy || !accounts.find(row => row.id === relationshipAccountId)?.version}
              onClick={() => void deactivateAccountLink()}>Deactivate this ANNIE link</button>)}
        {relationshipError && <p role="alert" className={s.error}>{relationshipError}</p>}
      </details>}
      {canEdit && <details><summary>{selected.archivedAt ? 'Restore Contact' : 'Archive Contact'}</summary>
        <label>Reason <input value={archiveReason} onChange={event => setArchiveReason(event.target.value)} /></label>
        <button type="button" disabled={busy || !archiveReason.trim()} onClick={archive}>{selected.archivedAt ? 'Restore' : 'Archive'} in ANNIE</button>
      </details>}
      <details><summary>Leads created from this Contact</summary>{relatedError ? <p role="alert" className={s.error}>{relatedError}</p> : relatedLeads.length ? <ul>{relatedLeads.map(lead =>
        <li key={lead.id}>{lead.displayName ?? 'Lead'}</li>)}</ul> : <p>No Leads created from this Contact.</p>}
        {relatedNext && <button type="button" onClick={() => void moreRelated()}>Load more Leads</button>}
      </details>
      <details open><summary>ANNIE history</summary>{history.length ? <ul>{history.map(event => <li key={event.id}>
        <strong>{event.action ?? event.eventType ?? 'Change'}</strong> · {event.occurredAt ?? ''}<br />
        Actor {ownerLabel(directory, event.actorId)}{event.changes != null && <pre>{JSON.stringify(event.changes, null, 2)}</pre>}
      </li>)}</ul> : <p>No history returned.</p>}
        {historyNext && <button type="button" onClick={() => void moreHistory()}>Load more history</button>}
      </details>
    </section>}
    {mode && <section className={s.panel}><h3>{mode === 'create' ? 'Create Contact' : 'Edit Contact'}</h3>
      <form className={s.form} onSubmit={save}>{fields.map(field => <label key={field.key}>{field.label}
        {field.type === 'checkbox' ? <input type="checkbox" checked={Boolean(draft[field.key])} onChange={event => setDraft(value => ({ ...value, [field.key]: event.target.checked }))} />
          : field.type === 'textarea' ? <textarea value={String(draft[field.key] ?? '')} onChange={event => setDraft(value => ({ ...value, [field.key]: event.target.value }))} />
          : field.type === 'owner' ? <select value={String(draft[field.key] ?? '')} onChange={event => setDraft(value => ({ ...value, [field.key]: event.target.value }))}><option value="">ANNIE default owner</option>{directory.users?.map(user => <option key={user.principalId} value={user.principalId}>{ownerLabel(directory, user.principalId)} · {roleLabel(user.role)}</option>)}</select>
          : field.type === 'team' ? <select value={String(draft[field.key] ?? '')} onChange={event => setDraft(value => ({ ...value, [field.key]: event.target.value }))}><option value="">No team</option>{directory.teams?.map(team => <option key={team} value={team}>{teamLabel(directory, team)}</option>)}</select>
          : field.type === 'account' ? <select value={String(draft[field.key] ?? '')} onChange={event => setDraft(value => ({ ...value, [field.key]: event.target.value }))}><option value="">No primary account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name ?? 'Account'}</option>)}</select>
          : <input type={field.type ?? 'text'} required={field.required} value={String(draft[field.key] ?? '')} onChange={event => setDraft(value => ({ ...value, [field.key]: event.target.value }))} />}
      </label>)}<div className={s.actions}><button type="submit" disabled={busy}>Save in ANNIE</button><button type="button" onClick={() => setMode(null)}>Cancel</button></div></form>
    </section>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>
}
