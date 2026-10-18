'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'
import { ownerLabel, type SalesDirectory } from './salesDirectory'
import s from './SalesModule.module.css'

type Stage = { id: string; code: string; label: string }
type Card = { id: string; organizationId: string; name: string; stageId: string; ownerProfileId?: string; version: number; amount?: string | number | null; currency?: string; archivedAt?: string | null; access?: { canEdit?: boolean } }
type PendingMove = { card: Card; stage: Stage }

async function sales(path: string, options?: { method: 'POST'; body: object; version: number }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session required')
  const response = await fetch(`/api/integrations/annie/sales/${path}`, {
    method: options?.method ?? 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${session.access_token}`,
      ...(options ? { 'Content-Type': 'application/json', 'X-Annie-Expected-Version': String(options.version) } : {}) },
    body: options ? JSON.stringify(options.body) : undefined,
  })
  let result: { data?: unknown; nextCursor?: string | null; code?: string }
  try { result = await response.json() } catch { throw new Error('ANNIE_INVALID_RESPONSE') }
  if (!response.ok) throw new Error(result.code ?? 'ANNIE_REQUEST_FAILED')
  return result
}

export default function PipelineBoard({ stages, directory, writeEnabled, syntheticOnly }: {
  stages: Stage[]; directory: SalesDirectory; writeEnabled: boolean; syntheticOnly: boolean
}) {
  const [cards, setCards] = useState<Card[]>([])
  const [owner, setOwner] = useState('')
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [amount, setAmount] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const reload = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const all: Card[] = []
      let cursor: string | null = null
      let more = false
      for (let page = 0; page < 20; page += 1) {
        const query = new URLSearchParams({ limit: '100' })
        if (cursor) query.set('cursor', cursor)
        const result = await sales(`opportunities?${query}`)
        if (!Array.isArray(result.data)) throw new Error('ANNIE_INVALID_RESPONSE')
        all.push(...result.data as Card[])
        cursor = result.nextCursor ?? null
        more = Boolean(cursor)
        if (!cursor) break
      }
      setCards(all); setTruncated(more)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PIPELINE_UNAVAILABLE') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  function choose(card: Card, stage: Stage) {
    if (card.stageId === stage.id || !writeEnabled || (syntheticOnly && !card.name.startsWith('QA PHASE C '))) return
    setPending({ card, stage }); setAmount(String(card.amount ?? '')); setLostReason(''); setReopenReason(''); setError(''); setNotice('')
  }
  async function move(event: React.FormEvent) {
    event.preventDefault()
    if (!pending || !/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return
    setBusy(true); setError('')
    try {
      const detail = await sales(`opportunities/${pending.card.id}`)
      const current = detail.data as Card | undefined
      if (!current || current.access?.canEdit !== true || (syntheticOnly && !current.name.startsWith('QA PHASE C ')))
        throw new Error('OPPORTUNITY_READ_ONLY')
      if (current.stageId !== pending.card.stageId) throw new Error('OPPORTUNITY_CHANGED_REFRESH_REQUIRED')
      await sales(`opportunities/${current.id}/transitions`, { method: 'POST', version: current.version,
        body: { stageCode: pending.stage.code, amount,
          ...(pending.stage.code === 'LOST' ? { lostReason: lostReason.trim() } : {}),
          ...(pending.stage.code === 'WON' ? { actualCloseDate: new Date().toISOString().slice(0, 10) } : {}),
          ...(reopenReason.trim() ? { reason: reopenReason.trim() } : {}) },
      })
      setPending(null); setNotice('ANNIE accepted the stage change.'); await reload()
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'ANNIE_REQUEST_FAILED'}. Stage remains unchanged here; refresh before retrying.`)
    } finally { setBusy(false) }
  }
  const visible = owner ? cards.filter(card => card.ownerProfileId === owner) : cards
  return <div className={s.card}>
    <div className={s.cardHeader}><h2>Opportunity pipeline</h2><button className={s.next} type="button" disabled={loading || busy} onClick={() => void reload()}>Refresh</button></div>
    <div className={s.filters}><label>Owner <select value={owner} onChange={event => setOwner(event.target.value)}><option value="">All owners</option>
      {directory.users?.map(user => <option key={user.principalId} value={user.principalId}>{ownerLabel(directory, user.principalId)}</option>)}
    </select></label></div>
    {loading && <p role="status">Loading ANNIE opportunities…</p>}
    {truncated && <p role="status">Showing the first 2,000 opportunities. Use ANNIE search for older records.</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!loading && <div className={s.board} aria-label="Opportunity stages">{stages.map(stage => <section key={stage.id}
      onDragOver={event => { if (writeEnabled) event.preventDefault() }}
      onDrop={event => { event.preventDefault(); const card = cards.find(item => item.id === event.dataTransfer.getData('text/plain')); if (card) choose(card, stage) }}>
      <h3>{stage.label} · {visible.filter(card => card.stageId === stage.id).length}</h3>
      {visible.filter(card => card.stageId === stage.id).map(card => <article key={card.id}
        draggable={writeEnabled && (!syntheticOnly || card.name.startsWith('QA PHASE C '))}
        onDragStart={event => event.dataTransfer.setData('text/plain', card.id)}>
        <strong>{card.name}</strong><small>{ownerLabel(directory, card.ownerProfileId)} · {card.currency ?? 'USD'} {String(card.amount ?? '—')}</small>
        {writeEnabled && (!syntheticOnly || card.name.startsWith('QA PHASE C ')) && <label>Move to <select value="" onChange={event => {
          const target = stages.find(item => item.id === event.target.value); if (target) choose(card, target)
        }}><option value="">Choose stage</option>{stages.filter(item => item.id !== stage.id).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      </article>)}
    </section>)}</div>}
    {pending && <form className={s.filters} onSubmit={event => void move(event)}>
      <p>Move {pending.card.name} to {pending.stage.label}. ANNIE will validate the transition.</p>
      <label>Amount <input type="number" min="0.01" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
      {pending.stage.code === 'LOST' && <label>Loss reason <input required value={lostReason} onChange={event => setLostReason(event.target.value)} /></label>}
      <label>Reopen reason, if needed <input value={reopenReason} onChange={event => setReopenReason(event.target.value)} /></label>
      <button className={s.next} type="submit" disabled={busy}>Confirm in ANNIE</button>
      <button className={s.next} type="button" disabled={busy} onClick={() => setPending(null)}>Cancel</button>
    </form>}
  </div>
}
