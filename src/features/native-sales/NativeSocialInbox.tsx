'use client'
import { useEffect, useMemo, useState } from 'react'
import type { NativeRequest } from './NativeSalesModule'
import s from './NativeSalesModule.module.css'

type Inbox = {
  assets: { id: string; displayName: string }[]
  conversations: { id: string; asset_id: string; channel: string; kind: string;
    last_event_at: string; last_text: string | null; unread: boolean }[]
  messages: { id: string; conversation_id: string; direction: string;
    text_content: string | null; status: string; occurred_at: string }[]
  comments: { id: string; asset_id: string; direction: string;
    text_content: string | null; status: string; occurred_at: string }[]
}
const empty: Inbox = { assets: [], conversations: [], messages: [], comments: [] }
const time = (value: string) => Number.isNaN(Date.parse(value)) ? '' : new Date(value).toLocaleString()

export default function NativeSocialInbox({ request }: { request: NativeRequest }) {
  const [inbox, setInbox] = useState<Inbox>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    void request('social/inbox').then(result => {
      if (cancelled) return
      const data = result.data as Inbox | null
      if (data && Array.isArray(data.assets) && Array.isArray(data.conversations) &&
        Array.isArray(data.messages) && Array.isArray(data.comments)) setInbox(data)
      else setError('SOCIAL_RESPONSE_UNAVAILABLE')
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'SOCIAL_UNAVAILABLE') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request])
  const assetNames = useMemo(() => new Map(inbox.assets.map(item => [item.id, item.displayName])), [inbox.assets])
  const conversationNames = useMemo(() => new Map(inbox.conversations.map(item =>
    [item.id, assetNames.get(item.asset_id) || 'Social conversation'])), [assetNames, inbox.conversations])
  return <div className={s.reportGrid}>
    {loading && <p role="status">Loading Social activity…</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!loading && !error && <>
      <section className={s.panel}><h2>Conversations</h2>
        {inbox.conversations.length === 0 && <p>No permitted conversations yet.</p>}
        <ul className={s.breakdown}>{inbox.conversations.map(item => <li key={item.id}>
          <span className={s.socialText}><strong>{assetNames.get(item.asset_id) || 'Social'}</strong>
            <small>{item.channel} · {item.kind} · {time(item.last_event_at)}</small>
            <span>{item.last_text || 'No text'}</span></span>
          {item.unread && <strong>New</strong>}</li>)}</ul>
      </section>
      <section className={s.panel}><h2>Messages</h2>
        {inbox.messages.length === 0 && <p>No permitted messages yet.</p>}
        <ul className={s.breakdown}>{inbox.messages.map(item => <li key={item.id}>
          <span className={s.socialText}><strong>{conversationNames.get(item.conversation_id) || 'Social'}</strong>
            <small>{item.direction} · {time(item.occurred_at)}</small>
            <span>{item.text_content || 'No text'}</span></span></li>)}</ul>
      </section>
      <section className={s.panel}><h2>Comments</h2>
        {inbox.comments.length === 0 && <p>No permitted comments yet.</p>}
        <ul className={s.breakdown}>{inbox.comments.map(item => <li key={item.id}>
          <span className={s.socialText}><strong>{assetNames.get(item.asset_id) || 'Social'}</strong>
            <small>{item.direction} · {time(item.occurred_at)}</small>
            <span>{item.text_content || 'No text'}</span></span></li>)}</ul>
      </section>
    </>}
  </div>
}
