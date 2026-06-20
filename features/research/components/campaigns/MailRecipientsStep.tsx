'use client'
import type { Dispatch, SetStateAction } from 'react'
import { useResearchTheme } from '../../theme'
import { useResearch } from '../ResearchContext'
import ContactCheckRow from './ContactCheckRow'

type Props = {
  recipients: string[]
  setRecipients: Dispatch<SetStateAction<string[]>>
  search: string
  setSearch: (v: string) => void
  onBack: () => void
  onNext: () => void
}

export default function MailRecipientsStep({ recipients, setRecipients, search, setSearch, onBack, onNext }: Props) {
  const { border, t1, t2, t3, accent, inputStyle } = useResearchTheme()
  const { leads } = useResearch()
  const withEmail = leads.filter(l => l.email)
  const visible = withEmail.filter(l => !search || `${l.official_title} ${l.lead_sponsor} ${l.email} ${l.nct}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input placeholder="Search leads by title, sponsor, email, NCT..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <button onClick={() => setRecipients(withEmail.map(l => l.id))} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>Select all</button>
        <button onClick={() => setRecipients([])} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>Clear</button>
      </div>
      <div style={{ fontSize: 12, color: t1, fontWeight: 600, marginBottom: 10 }}>{recipients.length} recipients selected <span style={{ color: t3, fontWeight: 400 }}>of {withEmail.length} with email</span></div>
      <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 12 }}>
        {visible.map(l => (
          <ContactCheckRow key={l.id} checked={recipients.includes(l.id)}
            onToggle={() => setRecipients(p => p.includes(l.id) ? p.filter(x => x !== l.id) : [...p, l.id])}
            primary={l.official_title || l.conditions || '—'} secondary={`${l.lead_sponsor} · ${l.nct}`}
            right={<div style={{ fontSize: 10, color: t2, fontFamily: 'DM Mono' }}>{l.email}</div>} highlight />
        ))}
        {withEmail.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: t3, fontSize: 12 }}>No leads with email</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>&larr; Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={onNext} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Preview &rarr;</button>
      </div>
    </div>
  )
}
