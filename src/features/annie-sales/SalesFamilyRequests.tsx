'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import s from './SalesModule.module.css'

type FamilyRequest = { id: string; status: string; relationship: string;
  dependentName: string; createdAt: string; reviewedAt?: string | null }
type Contact = { id: string; displayName: string }

async function annie(path: string, method = 'GET', body?: object) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('SESSION_REQUIRED')
  const response = await fetch(`/api/integrations/annie/sales/${path}`, {
    method, cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json() as { data?: unknown; code?: string }
  if (!response.ok) throw new Error(result.code ?? 'FAMILY_REQUEST_UNAVAILABLE')
  return result.data
}

export default function SalesFamilyRequests({ primaryId, canReview, canRequest, onApproved }: {
  primaryId: string; canReview: boolean; canRequest: boolean; onApproved: () => void
}) {
  const [requests, setRequests] = useState<FamilyRequest[]>([])
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactId, setContactId] = useState('')
  const [relationship, setRelationship] = useState('CHILD')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function reload() {
    setLoading(true); setError('')
    try {
      const data = await annie(`family/${primaryId}`)
      if (!Array.isArray(data)) throw new Error('ANNIE_INVALID_RESPONSE')
      setRequests(data as FamilyRequest[])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'FAMILY_REQUEST_UNAVAILABLE') }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [primaryId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function findContacts() {
    if (search.trim().length < 2) return
    setBusy(true); setError('')
    try {
      const query = new URLSearchParams({ q: search.trim(), limit: '25' })
      const data = await annie(`contacts?${query}`)
      if (!Array.isArray(data)) throw new Error('ANNIE_INVALID_RESPONSE')
      setContacts(data as Contact[]); setContactId('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'CONTACT_SEARCH_FAILED') }
    finally { setBusy(false) }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!canRequest || !contactId) return
    setBusy(true); setError(''); setNotice('')
    try {
      await annie(`family/${primaryId}`, 'POST', { dependentContactId: contactId, relationship })
      setNotice('Request sent to ANNIE for staff approval. No additional charge is created.')
      setContactId(''); setContacts([]); setSearch(''); await reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'FAMILY_REQUEST_FAILED') }
    finally { setBusy(false) }
  }
  async function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!canReview) return
    setBusy(true); setError(''); setNotice('')
    try {
      await annie(`family/${primaryId}/${id}`, 'PATCH', { status })
      setNotice(status === 'APPROVED' ? 'Dependant issued in ANNIE with no new charge.' : 'Request rejected in ANNIE.')
      await reload()
      if (status === 'APPROVED') onApproved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'FAMILY_REVIEW_FAILED') }
    finally { setBusy(false) }
  }
  return <section className={s.card} aria-label="Family member requests">
    <h3>Family member requests</h3>
    <p className={s.muted}>Existing paid Family membership · request stays pending until authorized ANNIE staff approval · no extra charge.</p>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading requests…</p>}
    {!loading && (requests.length ? <ul className={s.list}>{requests.map(row => <li key={row.id}>
      <div><strong>{row.dependentName}</strong><small>{row.relationship.toLowerCase()} · {row.status.replaceAll('_', ' ').toLowerCase()}</small></div>
      {canReview && row.status === 'PENDING_REVIEW' && <div>
        <button className={s.next} type="button" disabled={busy} onClick={() => void decide(row.id, 'APPROVED')}>Approve</button>{' '}
        <button className={s.next} type="button" disabled={busy} onClick={() => void decide(row.id, 'REJECTED')}>Reject</button>
      </div>}
    </li>)}</ul> : <p className={s.muted}>No family requests.</p>)}
    {canRequest && <form onSubmit={event => void submit(event)}>
      <h4>Request an existing Contact as a family member</h4>
      <div className={s.filters}><label>Search Contact
        <input value={search} onChange={event => setSearch(event.target.value)} minLength={2} placeholder="Name" /></label>
        <button className={s.next} type="button" disabled={busy || search.trim().length < 2} onClick={() => void findContacts()}>Find</button>
        <label>Contact <select required value={contactId} onChange={event => setContactId(event.target.value)}>
          <option value="">Select Contact</option>{contacts.map(row => <option key={row.id} value={row.id}>{row.displayName}</option>)}
        </select></label>
        <label>Relationship <select value={relationship} onChange={event => setRelationship(event.target.value)}>
          <option value="SPOUSE">Spouse or partner</option><option value="CHILD">Child</option>
          <option value="PARENT">Parent</option><option value="OTHER">Other</option>
        </select></label>
      </div>
      <button className={s.next} type="submit" disabled={busy || !contactId}>Request staff approval</button>
    </form>}
  </section>
}
