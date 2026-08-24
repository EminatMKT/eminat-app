'use client'
import { RESEARCH_THEME } from '../../theme'
import { useT } from '@/shared/i18n'
import { useResearch } from '../ResearchContext'
import StageBadge from '../StageBadge'
import { FROZEN_COLS } from '../../constants'
import { specialtyLabel } from '../../utils/specialty'
import type { Lead } from '../../types'

export default function LeadRow({ lead: l }: { lead: Lead }) {
  const { border, t1, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { setModalLead, openEditLead, setModalActivity, setModalCount } = useResearch()
  // Una celda = una regla. Las de datos sueltos en gris medio; las identificatorias (NCT#,
  // título) con más peso; las fechas y códigos en mono para que las columnas se alineen.
  const cell = { padding: '9px 12px', color: t2, verticalAlign: 'middle' } as const
  const mono = { ...cell, fontFamily: 'DM Mono', fontSize: 10.5, whiteSpace: 'nowrap' } as const
  const clip = (max: number) => ({ ...cell, maxWidth: max, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) as const
  const iconBtn = { width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 11, cursor: 'pointer' }
  return (
    <tr className="data-row" style={{ borderBottom: `1px solid ${border}` }}>
      {/* Las dos primeras quedan congeladas al desplazarse a lo ancho: son las que dicen de qué
          estudio es la fila. El fondo opaco lo pone la clase `sticky-cell` (globals.css) — sin
          fondo, las columnas de atrás se verían por debajo al pasar. */}
      <td className="sticky-cell" style={{ ...mono, color: accent, position: 'sticky', left: FROZEN_COLS[0].left, zIndex: 1, width: FROZEN_COLS[0].width, minWidth: FROZEN_COLS[0].width }}>{l.nct_number || '—'}</td>
      <td className="sticky-cell" style={{ ...clip(FROZEN_COLS[1].width), color: t1, fontWeight: 600, position: 'sticky', left: FROZEN_COLS[1].left, zIndex: 1, width: FROZEN_COLS[1].width, minWidth: FROZEN_COLS[1].width }}>{l.official_title || '—'}</td>
      <td style={{ ...mono, color: t3 }}>{l.date_added || '—'}</td>
      <td style={clip(130)}>{l.conditions || '—'}</td>
      <td style={clip(130)}>{specialtyLabel(l.especialidad, t)}</td>
      <td style={{ ...cell, textAlign: 'center' }}>
        <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 999, background: `${accent}18`, color: accent, fontWeight: 700, whiteSpace: 'nowrap' }}>{l.phase || '—'}</span>
      </td>
      <td style={clip(110)}>{l.recruitment_status || '—'}</td>
      <td style={clip(110)}>{l.countries || '—'}</td>
      <td style={clip(130)}>{l.lead_sponsor || '—'}</td>
      <td style={clip(120)}>{l.contact_name || '—'}</td>
      <td style={{ ...clip(160), color: '#4F86D6' }}>{l.contact_email || '—'}</td>
      <td style={{ ...cell, textAlign: 'center' }}>
        {/* Contador de correos: se edita SOLO por el pop-up (confirmación), nunca inline —
            un clic accidental acá cuesta la trazabilidad del seguimiento. */}
        <button onClick={() => setModalCount(l)} title={t('research.count.title')}
          style={{
            minWidth: 34, padding: '3px 9px', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 11,
            fontFamily: 'DM Mono', fontVariantNumeric: 'tabular-nums',
            border: `1px solid ${l.email_count ? `${accent}55` : border}`,
            background: l.email_count ? `${accent}18` : 'transparent',
            color: l.email_count ? accent : t3,
          }}>
          {l.email_count ?? '—'}
        </button>
      </td>
      <td style={cell}><StageBadge stage={l.stage} /></td>
      <td style={{ ...mono, color: t3 }}>{l.next_followup_date || '—'}</td>
      <td style={cell}>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => setModalLead(l)} style={iconBtn} title={t('research.leads.view')}>👁</button>
          <button onClick={() => openEditLead(l)} style={iconBtn} title={t('research.leads.edit')}>✏️</button>
          <button onClick={() => setModalActivity(l)} style={iconBtn} title={t('research.leads.activity')}>📞</button>
        </div>
      </td>
    </tr>
  )
}
