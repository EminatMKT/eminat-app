'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, type SalesDirectory } from './salesDirectory'
import s from './LeadOperations.module.css'

export type Task = { id: string; title: string; version: number; status: string; dueAt: string; description?: string | null;
  priority: string; assigneeId: string; leadId?: string | null; notes?: string | null }

export default function ActivityOperations({ selected, directory, enabled, syntheticOnly, onChanged }: {
  selected: Task | null; directory: SalesDirectory; enabled: boolean; syntheticOnly: boolean; onChanged: (id: string) => void
}) {
  const key = useRef('')
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [due, setDue] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [status, setStatus] = useState('PENDING')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setMode(null); setError(''); setNotice('')
    setTitle(selected?.title ?? ''); setDescription(selected?.description ?? '')
    setDue(selected?.dueAt ? new Date(selected.dueAt).toISOString().slice(0, 16) : '')
    setAssignee(selected?.assigneeId ?? ''); setPriority(selected?.priority ?? 'MEDIUM')
    setStatus(selected?.status ?? 'PENDING'); key.current = ''
  }, [selected?.id, selected?.version, selected?.title, selected?.description, selected?.dueAt,
    selected?.assigneeId, selected?.priority, selected?.status])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!mode || (syntheticOnly && !title.startsWith('QA PHASE C ')) || !due || !assignee) return
    setBusy(true); setError(''); setNotice('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session required')
      const create = mode === 'create'
      if (create && !key.current) key.current = crypto.randomUUID()
      const body = create ? { title, description: description || null, type: 'GENERAL', assigneeId: assignee,
        priority, dueAt: new Date(due).toISOString() } :
        { title, description: description || null, assigneeId: assignee, priority,
          dueAt: new Date(due).toISOString(), status }
      const response = await fetch(`/api/integrations/annie/sales/activities${!create && selected ? `/${selected.id}` : ''}`, {
        method: create ? 'POST' : 'PATCH', cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json',
          ...(create ? { 'Idempotency-Key': key.current } : { 'X-Annie-Expected-Version': String(selected?.version ?? '') }) },
        body: JSON.stringify(body),
      })
      let result: { data?: { id?: string }; code?: string }
      try { result = await response.json() } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
      if (!response.ok) throw new Error(result.code ?? 'ACTIVITY_SAVE_FAILED')
      key.current = ''; setMode(null); setNotice('Task saved in ANNIE.')
      if (result.data?.id) onChanged(result.data.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ACTIVITY_SAVE_FAILED') }
    finally { setBusy(false) }
  }
  const editable = !!selected && (!syntheticOnly || selected.title.startsWith('QA PHASE C ')) &&
    !['COMPLETED', 'CANCELLED'].includes(selected.status)
  return <section className={s.workspace} aria-label="ANNIE task operations">
    {enabled && <button className={s.action} type="button" onClick={() => {
      setTitle(syntheticOnly ? 'QA PHASE C ' : ''); setDescription(''); setDue(''); setAssignee(''); setPriority('MEDIUM'); setStatus('PENDING'); setMode('create')
    }}>Create {syntheticOnly ? 'synthetic ' : ''}task</button>}
    {enabled && editable && <button type="button" onClick={() => setMode('edit')}>Edit {syntheticOnly ? 'synthetic ' : ''}task</button>}
    {selected && <p>{selected.title} · {selected.status} · {ownerLabel(directory, selected.assigneeId)}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {mode && <form className={s.form} onSubmit={event => void save(event)}>
      <label>Title <input required maxLength={240} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Description <textarea maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label>Due <input type="datetime-local" required value={due} onChange={event => setDue(event.target.value)} /></label>
      <label>Assignee <select required value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Select staff member</option>
        {directory.users?.filter(user => ['SUPERADMIN', 'ADMINISTRATOR', 'SALES_MANAGER', 'OPERATOR'].includes(user.role))
          .map(user => <option key={user.principalId} value={user.principalId}>{ownerLabel(directory, user.principalId)}</option>)}
      </select></label>
      <label>Priority <select value={priority} onChange={event => setPriority(event.target.value)}>
        {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      {mode === 'edit' && selected && <label>Status <select value={status} onChange={event => setStatus(event.target.value)}>
        {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>}
      <button type="submit" disabled={busy || !title.trim() || (syntheticOnly && !title.startsWith('QA PHASE C ')) || !due || !assignee}>Save in ANNIE</button>
      <button type="button" onClick={() => setMode(null)}>Cancel</button>
    </form>}
  </section>
}
