'use client'
import { useResearchTheme } from '../../theme'
import { useResearch } from '../ResearchContext'
import ContactCheckRow from './ContactCheckRow'
import StageBadge from '../StageBadge'

type Props = {
  selected: string[]
  onToggle: (id: string) => void
  search: string
  setSearch: (v: string) => void
  onNext: () => void
}

export default function NewsletterContactsStep({ selected, onToggle, search, setSearch, onNext }: Props) {
  const { s1, border, t3, accent, inputStyle } = useResearchTheme()
  const { leads } = useResearch()
  const visible = leads.filter(l => !search || (l.contact_name || '').toLowerCase().includes(search.toLowerCase()) || (l.email || '').toLowerCase().includes(search.toLowerCase()) || (l.phone || '').includes(search))

  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..." style={{ ...inputStyle, marginBottom: 12 }} />
      <div style={{ fontSize: 11, color: t3, marginBottom: 8 }}>{selected.length} contacts selected</div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {visible.map(l => (
          <ContactCheckRow key={l.id} checked={selected.includes(l.id)} onToggle={() => onToggle(l.id)}
            primary={l.contact_name || '—'} secondary={`${l.email} · ${l.phone || 'No phone'}`} right={<StageBadge stage={l.stage} />} />
        ))}
      </div>
      <button onClick={onNext} disabled={selected.length === 0} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, background: selected.length > 0 ? accent : t3, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: selected.length > 0 ? 'pointer' : 'default' }}>Next →</button>
    </div>
  )
}
