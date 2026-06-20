'use client'
import { useResearchTheme } from '../../theme'

export default function MailStepTab({ index, label, active, onClick }: { index: number; label: string; active: boolean; onClick: () => void }) {
  const { t3, accent } = useResearchTheme()
  return (
    <button onClick={onClick} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', background: active ? `${accent}15` : 'transparent', color: active ? accent : t3 }}>
      {index + 1}. {label}
    </button>
  )
}
