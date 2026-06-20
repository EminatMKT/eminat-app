import { useResearchTheme } from '../theme'
import { COUNTRY_FLAGS } from '../constants'

export default function CountryChip({ country, count }: { country: string; count: number }) {
  const { s2, border, t1, accent } = useResearchTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: s2, border: `1px solid ${border}` }}>
      <span style={{ fontSize: 16 }}>{COUNTRY_FLAGS[country] || '🌍'}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{country}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: accent, background: `${accent}20`, padding: '1px 7px', borderRadius: 10 }}>{count}</span>
    </div>
  )
}
