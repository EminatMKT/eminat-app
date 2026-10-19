'use client'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type Resource = 'leads' | 'contacts' | 'accounts' | 'opportunities'
type Account = { id: string; name: string }
const titles: Record<Resource,string> = {
  leads:'Lead',contacts:'Contact',accounts:'Account',opportunities:'Opportunity',
}
const today = () => new Date().toISOString().slice(0,10)

export default function NativeSalesCreate({ resource, request, onSaved }: {
  resource: Resource; request: NativeRequest; onSaved: () => void
}) {
  const [name,setName] = useState('')
  const [source,setSource] = useState('manual')
  const [email,setEmail] = useState('')
  const [phone,setPhone] = useState('')
  const [companyName,setCompanyName] = useState('')
  const [accountType,setAccountType] = useState<'prospect'|'customer'|'partner'>('prospect')
  const [accountQuery,setAccountQuery] = useState('')
  const [accounts,setAccounts] = useState<Account[]>([])
  const [accountId,setAccountId] = useState('')
  const [accountError,setAccountError] = useState('')
  const [amount,setAmount] = useState('')
  const [expectedCloseDate,setExpectedCloseDate] = useState(today)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const key = useRef({ payload: '', value: '' })

  useEffect(() => {
    if (resource!=='opportunities' && resource!=='contacts') return
    let cancelled = false
    setAccountError('')
    const params = new URLSearchParams({ limit:'50' })
    if (accountQuery.trim()) params.set('q',accountQuery.trim())
    void request(`accounts?${params}`).then(result => {
      if (cancelled) return
      setAccounts(Array.isArray(result.data) ? result.data as Account[] : [])
    }).catch(() => { if (!cancelled) { setAccounts([]); setAccountError('Account search is unavailable.') } })
    return () => { cancelled = true }
  }, [resource,accountQuery,request])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    const common = { ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}) }
    let payload: Record<string,unknown>
    if (resource==='leads') payload = { displayName:name.trim(),source:source.trim(),...common,
      ...(companyName.trim() ? { companyName:companyName.trim() } : {}) }
    else if (resource==='contacts') payload = { displayName:name.trim(),...common,
      ...(source.trim() ? { source:source.trim() } : {}),
      ...(accountId ? {primaryAccountId:accountId} : {}) }
    else if (resource==='accounts') payload = { name:name.trim(),type:accountType,...common,
      ...(source.trim() ? { source:source.trim() } : {}) }
    else payload = { name:name.trim(),accountId,currency:'USD',
      amount:amount.trim() || null,expectedCloseDate }
    const serialized = JSON.stringify(payload)
    if (key.current.payload!==serialized) key.current = { payload:serialized,value:crypto.randomUUID() }
    try {
      await request(resource,{ method:'POST',payload,idempotencyKey:key.current.value })
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'SAVE_FAILED') }
    finally { setBusy(false) }
  }

  return <form className={`${s.panel} ${s.form}`} onSubmit={event => void submit(event)}>
    <h2>Add {titles[resource]}</h2>
    <div className={s.formGrid}>
      <label>Name <input required maxLength={500} value={name} onChange={event => setName(event.target.value)} /></label>
      {resource!=='opportunities' && <label>Email <input type="email" maxLength={320} value={email} onChange={event => setEmail(event.target.value)} /></label>}
      {resource!=='opportunities' && <label>Phone <input maxLength={80} value={phone} onChange={event => setPhone(event.target.value)} /></label>}
      {resource==='leads' && <label>Company <input maxLength={500} value={companyName} onChange={event => setCompanyName(event.target.value)} /></label>}
      {resource!=='opportunities' && <label>Source <input required={resource==='leads'} maxLength={500} value={source} onChange={event => setSource(event.target.value)} /></label>}
      {resource==='accounts' && <label>Type <select value={accountType} onChange={event => setAccountType(event.target.value as typeof accountType)}>
        <option value="prospect">Prospect</option><option value="customer">Customer</option><option value="partner">Partner</option>
      </select></label>}
      {(resource==='opportunities' || resource==='contacts') && <>
        <label>Find Account <input value={accountQuery} onChange={event => { setAccountQuery(event.target.value);setAccountId('') }} placeholder="Search by name" /></label>
        <label>Account <select required={resource==='opportunities'} value={accountId} onChange={event => setAccountId(event.target.value)}>
          <option value="">{resource==='contacts' ? 'No primary Account' : 'Choose an Account'}</option>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select></label>
      </>}
      {resource==='opportunities' && <>
        <label>Amount (USD) <input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label>Expected close <input required type="date" value={expectedCloseDate} onChange={event => setExpectedCloseDate(event.target.value)} /></label>
      </>}
    </div>
    {accountError && <p role="alert" className={s.error}>{accountError}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    <button type="submit" disabled={busy || (resource==='opportunities' && !accountId)}>{busy ? 'Saving…' : `Save ${titles[resource]}`}</button>
  </form>
}
