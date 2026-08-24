import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import { SPECIALTY_LABEL_KEY } from '../../utils/specialty'
import type { SpecialtyMatch } from '../../hooks/useResearchData'

// Una fila del listado que muestra el backfill antes de guardar: NCT#, título y la especialidad
// que se derivó de su clasificación MeSH.
export default function SpecialtyMatchRow({ match }: { match: SpecialtyMatch }) {
  const { border, t1, t3 } = RESEARCH_THEME
  const { t } = useT()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: `1px solid ${border}`, fontSize: 11 }}>
      <span style={{ fontFamily: 'DM Mono', color: t3, whiteSpace: 'nowrap' }}>{match.nct}</span>
      <span style={{ color: t3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.title}</span>
      <strong style={{ color: t1, whiteSpace: 'nowrap' }}>{t(SPECIALTY_LABEL_KEY[match.especialidad])}</strong>
    </div>
  )
}
