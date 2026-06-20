import { useResearchTheme } from '../theme'

export default function StatCard({ label, value, color, size = 'md' }: { label: string; value: React.ReactNode; color: string; size?: 'sm' | 'md' }) {
  const { s1, border, t3 } = useResearchTheme()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: size === 'sm' ? '14px 16px' : '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Syne', fontSize: size === 'sm' ? 24 : 28, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
