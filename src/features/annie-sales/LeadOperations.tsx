'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { historyChanges } from './salesHistory'
import { ownerLabel, roleLabel, teamLabel, type SalesDirectory } from './salesDirectory'
import s from './LeadOperations.module.css'

export type Lead = Record<string, unknown> & {
  id: string; organizationId: string; version: number; displayName?: string; status?: string
  archivedAt?: string | null; convertedAt?: string | null; access?: { canEdit?: boolean }
}
export type LeadStage = { code: string; label: string; nextCodes: string[] }
type History = { id: string; action?: string; eventType?: string; occurredAt?: string; actorId?: string; changes?: unknown }
type Field = { key: string; label: string; type?: 'text' | 'email' | 'url' | 'date' | 'datetime-local' | 'textarea' | 'checkbox' | 'owner' | 'team'; required?: boolean }
const fields: Field[] = [
  { key: 'displayName', label: 'Display name', required: true },
  { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' },
  { key: 'title', label: 'Job title' }, { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' }, { key: 'companyName', label: 'Company' },
  { key: 'website', label: 'Website', type: 'url' }, { key: 'industry', label: 'Industry' },
  { key: 'source', label: 'Source', required: true }, { key: 'sourceDetail', label: 'Source detail' },
  { key: 'product', label: 'Product' }, { key: 'plan', label: 'Plan' },
  { key: 'nextAction', label: 'Next action' }, { key: 'nextFollowUpAt', label: 'Next follow-up', type: 'datetime-local' },
  { key: 'description', label: 'Notes', type: 'textarea' },
  { key: 'address.street', label: 'Street' }, { key: 'address.city', label: 'City' },
  { key: 'address.state', label: 'State' }, { key: 'address.postalCode', label: 'Postal code' },
  { key: 'address.country', label: 'Country' },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'corazonSalud', label: 'Corazón Salud', type: 'checkbox' },
  { key: 'doNotCall', label: 'Do not call', type: 'checkbox' },
  { key: 'doNotEmail', label: 'Do not email', type: 'checkbox' },
  { key: 'ownerProfileId', label: 'ANNIE owner', type: 'owner' },
  { key: 'teamId', label: 'ANNIE team', type: 'team' },
]
function valueOf(row: Lead | null, key: string): string | boolean {
  const value = key.includes('.') ? (row?.[key.split('.')[0]] as Record<string, unknown> | null)?.[key.split('.')[1]] : row?.[key]
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return ''
  if (key === 'nextFollowUpAt') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  return value
}
function payloadFrom(draft: Record<string, string | boolean>, selected: Lead | null) {
  const output: Record<string, unknown> = {}
  const address: Record<string, string | null> = {}
  for (const field of fields) {
    const value = draft[field.key]
    if (value === undefined || (selected && value === valueOf(selected, field.key))) continue
    if (!selected && !field.required && (value === '' || value === false)) continue
    if (field.key === 'ownerProfileId' && value === '') continue
    if (field.key.startsWith('address.')) { address[field.key.slice(8)] = String(value).trim() || null; continue }
    if (field.type === 'checkbox') { output[field.key] = Boolean(value); continue }
    if (field.type === 'datetime-local') { output[field.key] = value ? new Date(String(value)).toISOString() : null; continue }
    if (field.required) { output[field.key] = String(value).trim(); continue }
    output[field.key] = String(value).trim() || null
  }
  if (Object.keys(address).length) {
    const old = selected?.address && typeof selected.address === 'object' ? selected.address as Record<string, unknown> : {}
    output.address = { ...old, ...address }
  }
  return output
}

export default function LeadOperations({ selected, writeEnabled, syntheticOnly, onChanged, stages }: {
  selected: Lead | null; writeEnabled: boolean; syntheticOnly: boolean;
  onChanged: (id: string) => void; stages: LeadStage[]
}) {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [draft, setDraft] = useState<Record<string, string | boolean>>({})
  const [history, setHistory] = useState<History[]>([])
  const [historyNext, setHistoryNext] = useState<string | null>(null)
  const [directory, setDirectory] = useState<SalesDirectory>({})
  const [transition, setTransition] = useState('')
  const [archiveReason, setArchiveReason] = useState('')
  const [conversion, setConversion] = useState({ accountName: '', opportunityName: '', currency: 'USD', amount: '', expectedCloseDate: '' })
  const [conversionKey, setConversionKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function api(path: string, method = 'GET', body?: object, version?: number, key?: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session required')
    const response = await fetch(`/api/integrations/annie/sales/${path}`, {
      method, cache: 'no-store', headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(version ? { 'X-Annie-Expected-Version': String(version) } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
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
    setHistory([]); setHistoryNext(null); setMode(null); setError(''); setNotice(''); setConversionKey('')
    if (!selected) return
    let cancelled = false
    void api(`leads/${selected.id}/history?limit=25`).then(result => {
      if (!cancelled) { setHistory(Array.isArray(result.data) ? result.data as History[] : []); setHistoryNext(result.nextCursor ?? null) }
    }).catch(() => { if (!cancelled) setHistory([]) })
    return () => { cancelled = true }
  }, [selected?.id, selected?.version]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!writeEnabled) return
    let cancelled = false
    void api('directory').then(result => {
      if (!cancelled) setDirectory(result.data as SalesDirectory ?? {})
    }).catch(() => { if (!cancelled) setDirectory({}) })
    return () => { cancelled = true }
  }, [writeEnabled]) // eslint-disable-line react-hooks/exhaustive-deps
  function open(modeValue: 'create' | 'edit') {
    setMode(modeValue); setError(''); setNotice('')
    setDraft(Object.fromEntries(fields.map(field => [field.key, valueOf(modeValue === 'edit' ? selected : null, field.key)])))
    if (modeValue === 'create') setDraft(current => ({ ...current, source: '', displayName: '' }))
  }
  async function submit(action: () => Promise<{ data?: unknown }>, message: string, leadId?: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await action()
      const id = leadId ?? (result.data as { id?: string } | undefined)?.id ?? selected?.id
      setMode(null); setNotice(message)
      if (id) onChanged(id)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'ANNIE_REQUEST_FAILED'
      setError(/ANNIE_UNAVAILABLE|ANNIE_INVALID_RESPONSE|ANNIE_UPSTREAM_ERROR/.test(message)
        ? `${message}. The write outcome is uncertain. Refresh ANNIE history and search before retrying.` : message)
    }
    finally { setBusy(false) }
  }
  function saveForm(event: React.FormEvent) {
    event.preventDefault()
    const body = payloadFrom(draft, mode === 'edit' ? selected : null)
    if (mode === 'create') { body.status = 'NEW'; void submit(() => api('leads', 'POST', body), 'Lead created in ANNIE.'); return }
    if (!selected) return
    void submit(() => api(`leads/${selected.id}`, 'PATCH', body, selected.version), 'Lead updated in ANNIE.')
  }
  function move() {
    if (!selected || !transition) return
    void submit(() => api(`leads/${selected.id}/transitions`, 'POST', { status: transition }, selected.version), 'ANNIE accepted the transition.')
  }
  function archive() {
    if (!selected || !archiveReason.trim()) return
    void submit(() => api(`leads/${selected.id}/archive`, 'POST', { reason: archiveReason.trim(), restore: Boolean(selected.archivedAt) }, selected.version), selected.archivedAt ? 'Lead restored in ANNIE.' : 'Lead archived in ANNIE.')
  }
  function convert() {
    if (!selected) return
    const key = conversionKey || crypto.randomUUID().replaceAll('-', '')
    setConversionKey(key)
    const body: Record<string, unknown> = {}
    if (conversion.accountName) body.accountName = conversion.accountName
    if (conversion.opportunityName) body.opportunity = {
      name: conversion.opportunityName, currency: conversion.currency,
      amount: conversion.amount || null, expectedCloseDate: conversion.expectedCloseDate,
    }
    void submit(() => api(`leads/${selected.id}/convert`, 'POST', body, selected.version, key), 'ANNIE converted the Lead.', selected.id)
  }
  async function moreHistory() {
    if (!selected || !historyNext) return
    try {
      const result = await api(`leads/${selected.id}/history?limit=25&cursor=${historyNext}`)
      setHistory(current => [...current, ...(Array.isArray(result.data) ? result.data as History[] : [])])
      setHistoryNext(result.nextCursor ?? null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'HISTORY_FAILED') }
  }
  const canEdit = writeEnabled && selected?.access?.canEdit === true &&
    (!syntheticOnly || selected.displayName?.startsWith('QA PHASE C ') === true)
  return <div className={s.workspace}>
    {writeEnabled && <button type="button" className={s.action} onClick={() => open('create')}>{syntheticOnly ? 'Create synthetic Lead' : 'Create Lead'}</button>}
    {selected && <section className={s.panel} aria-label="Lead operations">
      <h3>{selected.displayName ?? 'Lead'} · ANNIE</h3>
      <p>{selected.status}</p>
      <button type="button" disabled={busy} onClick={() => onChanged(selected.id)}>Refresh from ANNIE</button>
      {canEdit && !selected.archivedAt && !selected.convertedAt && <div className={s.actions}>
        <button type="button" onClick={() => open('edit')}>Edit</button>
        <label>Next status <select value={transition} onChange={event => setTransition(event.target.value)}><option value="">Select…</option>{(stages.find(stage => stage.code === selected.status)?.nextCodes ?? []).map(code => <option key={code} value={code}>{stages.find(stage => stage.code === code)?.label ?? code}</option>)}</select></label>
        <button type="button" disabled={!transition || busy} onClick={move}>Move Lead</button>
      </div>}
      {canEdit && !selected.archivedAt && !selected.convertedAt && selected.status !== 'LOST' && <details><summary>Convert Lead</summary>
        <div className={s.form}>
          <label>New synthetic account name <input required value={conversion.accountName} onChange={e => setConversion(v => ({ ...v, accountName: e.target.value }))} /></label>
          <p>ANNIE creates the Contact from this Lead.</p>
          <label>Opportunity name (optional) <input value={conversion.opportunityName} onChange={e => setConversion(v => ({ ...v, opportunityName: e.target.value }))} /></label>
          {conversion.opportunityName && <><label>Currency <input value={conversion.currency} maxLength={3} onChange={e => setConversion(v => ({ ...v, currency: e.target.value }))} /></label><label>Amount <input value={conversion.amount} onChange={e => setConversion(v => ({ ...v, amount: e.target.value }))} /></label><label>Expected close <input type="date" value={conversion.expectedCloseDate} onChange={e => setConversion(v => ({ ...v, expectedCloseDate: e.target.value }))} /></label></>}
          <button type="button" disabled={busy || !conversion.accountName.trim() ||
            (syntheticOnly && (!conversion.accountName.startsWith('QA PHASE C ') ||
              Boolean(conversion.opportunityName && !conversion.opportunityName.startsWith('QA PHASE C '))))} onClick={convert}>Convert in ANNIE</button>
        </div></details>}
      {canEdit && <details><summary>{selected.archivedAt ? 'Restore Lead' : 'Archive Lead'}</summary><label>Reason <input value={archiveReason} onChange={e => setArchiveReason(e.target.value)} /></label><button type="button" disabled={busy || !archiveReason.trim()} onClick={archive}>{selected.archivedAt ? 'Restore' : 'Archive'} in ANNIE</button></details>}
      <details open><summary>ANNIE history</summary>{history.length ? <ul>{history.map(event => <li key={event.id}><strong>{event.action ?? event.eventType ?? 'Change'}</strong> · {event.occurredAt ?? ''}<br />Actor {ownerLabel(directory, event.actorId)}{historyChanges(event.changes, directory).map(change => <div key={change}>{change}</div>)}</li>)}</ul> : <p>No history returned.</p>}{historyNext && <button type="button" onClick={() => void moreHistory()}>Load more history</button>}</details>
    </section>}
    {mode && <section className={s.panel}><h3>{mode === 'create' ? (syntheticOnly ? 'Create synthetic Lead' : 'Create Lead') : (syntheticOnly ? 'Edit synthetic Lead' : 'Edit Lead')}</h3><form className={s.form} onSubmit={saveForm}>
      {fields.map(field => <label key={field.key}>{field.label}
        {field.type === 'checkbox' ? <input type="checkbox" checked={Boolean(draft[field.key])} onChange={e => setDraft(v => ({ ...v, [field.key]: e.target.checked }))} />
          : field.type === 'textarea' ? <textarea value={String(draft[field.key] ?? '')} onChange={e => setDraft(v => ({ ...v, [field.key]: e.target.value }))} />
          : field.type === 'owner' ? <select value={String(draft[field.key] ?? '')} onChange={e => setDraft(v => ({ ...v, [field.key]: e.target.value }))}><option value="">ANNIE default owner</option>{directory.users?.map(user => <option key={user.principalId} value={user.principalId}>{ownerLabel(directory, user.principalId)} · {roleLabel(user.role)}</option>)}</select>
          : field.type === 'team' ? <select value={String(draft[field.key] ?? '')} onChange={e => setDraft(v => ({ ...v, [field.key]: e.target.value }))}><option value="">No team</option>{directory.teams?.map(team => <option key={team} value={team}>{teamLabel(directory, team)}</option>)}</select>
          : <input type={field.type ?? 'text'} required={field.required} value={String(draft[field.key] ?? '')} onChange={e => setDraft(v => ({ ...v, [field.key]: e.target.value }))} />}
      </label>)}<div className={s.actions}><button type="submit" disabled={busy || !String(draft.displayName ?? '').trim() ||
        (syntheticOnly && !String(draft.displayName ?? '').startsWith('QA PHASE C '))}>Save in ANNIE</button><button type="button" onClick={() => setMode(null)}>Cancel</button></div>
    </form></section>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>
}
