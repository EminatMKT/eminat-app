'use client'
import { RESEARCH_THEME } from '../../theme'

export default function NewsletterStepCard({ index, label, icon, active, onClick }: { index: number; label: string; icon: string; active: boolean; onClick: () => void }) {
  const { s1, border, t2, t3, accent } = RESEARCH_THEME
  return (
    <div onClick={onClick} style={{ flex: 1, padding: '12px', borderRadius: 10, background: active ? `${accent}20` : s1, border: `1px solid ${active ? accent : border}`, textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: active ? accent : t2 }}>Step {index + 1}</div>
      <div style={{ fontSize: 10, color: t3 }}>{label}</div>
    </div>
  )
}
