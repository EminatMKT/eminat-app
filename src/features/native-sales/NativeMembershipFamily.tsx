'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type HouseholdMember = { id: string; displayName: string; relationship: string; status: string; code?: string }
type FamilyRequest = { id: string; dependentName: string; relationship: string; status: string;
  code?: string; createdAt: string }
type Contact = { id: string; display_name: string }

export default function NativeMembershipFamily({ membershipId, membershipType, household,
  role, request, onSaved }: { membershipId: string; membershipType: string;
    household: HouseholdMember[]; role: string; request: NativeRequest; onSaved: () => void }) {
  const { t } = useT()
  const [requests, setRequests] = useState<FamilyRequest[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactQuery, setContactQuery] = useState('')
  const [contactId, setContactId] = useState('')
  const [relationship, setRelationship] = useState<'SPOUSE'|'CHILD'|'PARENT'|'OTHER'>('CHILD')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const key = useRef({ payload: '', value: '' })
  const canReview = ['SUPERADMIN','ADMINISTRATOR','SALES_MANAGER'].includes(role)

  useEffect(() => {
    if (membershipType !== 'FAMILY') return
    let cancelled = false
    void request(`memberships/${membershipId}/family/requests`).then(result => {
      if (!cancelled) setRequests(Array.isArray(result.data) ? result.data as FamilyRequest[] : [])
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'FAMILY_REQUESTS_UNAVAILABLE') })
    return () => { cancelled = true }
  }, [membershipId, membershipType, request, refresh])

  useEffect(() => {
    if (membershipType !== 'FAMILY') return
    let cancelled = false
    const params = new URLSearchParams({ limit: '50' })
    if (contactQuery.trim()) params.set('q', contactQuery.trim())
    void request(`contacts?${params}`).then(result => {
      if (!cancelled) setContacts(Array.isArray(result.data) ? result.data as Contact[] : [])
    }).catch(() => { if (!cancelled) setContacts([]) })
    return () => { cancelled = true }
  }, [contactQuery, membershipType, request])

  if (membershipType !== 'FAMILY') return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!contactId) return
    const payload = { contactId, relationship }
    const serialized = JSON.stringify(payload)
    if (key.current.payload !== serialized) key.current = { payload: serialized, value: crypto.randomUUID() }
    setBusy(true); setError('')
    try {
      await request(`memberships/${membershipId}/family/requests`, {
        method: 'POST', payload, idempotencyKey: key.current.value,
      })
      setContactId(''); setContactQuery(''); key.current = { payload: '', value: '' }
      setRefresh(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'FAMILY_REQUEST_FAILED') }
    finally { setBusy(false) }
  }

  async function decide(id: string, status: 'APPROVED'|'REJECTED') {
    setBusy(true); setError('')
    try {
      await request(`memberships/${membershipId}/family/requests/${id}/decision`, {
        method: 'POST', payload: { status },
      })
      setRefresh(value => value + 1); onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'FAMILY_DECISION_FAILED') }
    finally { setBusy(false) }
  }

  const pending = requests.filter(item => item.status === 'PENDING').length
  const active = household.filter(item => item.status === 'ACTIVE').length
  return <section className={s.recordActions} aria-label={t('salesNative.familyMembership')}>
    <h3>{t('salesNative.householdSummary',{active,pending})}</h3>
    <ul className={s.scheduleList}>{household.map(member =>
      <li key={member.id}><span><strong>{member.displayName}</strong><small>{member.relationship} · {member.status} {member.code ? `· ${member.code}` : ''}</small></span></li>)}</ul>
    {requests.length > 0 && <><h3>{t('salesNative.familyRequests')}</h3><ul className={s.scheduleList}>{requests.map(item =>
      <li key={item.id}><span><strong>{item.dependentName}</strong><small>{item.relationship} · {item.status} · {item.createdAt.slice(0,10)}</small></span>
        {item.status === 'PENDING' && canReview && <span className={s.pdfActions}>
          <button type="button" disabled={busy} onClick={() => void decide(item.id, 'APPROVED')}>{t('salesNative.approve')}</button>
          <button type="button" disabled={busy} onClick={() => void decide(item.id, 'REJECTED')}>{t('salesNative.reject')}</button>
        </span>}</li>)}</ul></>}
    {active + pending < 3 && <form className={s.form} onSubmit={event => void submit(event)}>
      <h3>{t('salesNative.requestFamilyMember')}</h3><p>{t('salesNative.auditStaffApprovalIsRequiredNoExtraChargeIsCreated')}</p>
      <div className={s.formGrid}>
        <label>{t('salesNative.auditFindContact')} <input value={contactQuery} onChange={event => {setContactQuery(event.target.value); setContactId('')}} placeholder={t('salesNative.searchByName')} /></label>
        <label>{t('salesNative.auditContact')} <select required value={contactId} onChange={event => setContactId(event.target.value)}>
          <option value="">{t('salesNative.chooseAContact')}</option>{contacts.map(contact =>
            <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}</select></label>
        <label>{t('salesNative.auditRelationship')} <select value={relationship} onChange={event => setRelationship(event.target.value as typeof relationship)}>
          <option value="CHILD">{t('salesNative.child')}</option><option value="SPOUSE">{t('salesNative.auditSpouse')}</option><option value="PARENT">{t('salesNative.auditParent')}</option><option value="OTHER">{t('salesNative.auditOther')}</option>
        </select></label>
      </div><button type="submit" disabled={busy || !contactId}>{busy ? t('salesNative.renewalSaving') : t('salesNative.requestMember')}</button>
    </form>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </section>
}
