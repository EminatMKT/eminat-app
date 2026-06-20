'use client'
import { useResearchTheme } from '../../theme'

type Props = {
  recipientsCount: number
  type: string
  onReset: () => void
}

export default function NewsletterResultsStep({ recipientsCount, type, onReset }: Props) {
  const { s1, border, t3, accent } = useResearchTheme()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 30, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: '#34D399', marginBottom: 8 }}>Campaign sent</div>
      <div style={{ fontSize: 13, color: t3, marginBottom: 20 }}>{recipientsCount} contacts reached · {type}</div>
      <button onClick={onReset} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>New campaign</button>
    </div>
  )
}
