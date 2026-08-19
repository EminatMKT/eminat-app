import { RESEARCH_THEME } from '../../theme'

export default function CampaignStatBox({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  const { s2, t3 } = RESEARCH_THEME
  return (
    <div style={{ padding: '12px', borderRadius: 10, background: s2, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color }}>{value}</div>
      <div style={{ fontSize: 10, color: t3 }}>{label}</div>
    </div>
  )
}
