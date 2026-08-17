'use client'
import { RESEARCH_THEME, selectStyle } from '../../theme'
import { useT, type I18nKey } from '@/shared/i18n'
import FilterBar from '@/shared/components/FilterBar'
import { LEAD_FILTERS } from '../../utils/filters'
import { useResearch } from '../ResearchContext'
import Panel from '../Panel'
import ToolbarButton from '../ToolbarButton'
import LeadRow from './LeadRow'

// Cabeceras de la tabla. Claves cortas propias (`research.col.*`) y no las de `research.field.*`:
// el label de formulario ("Nombre de contacto") no entra en una columna de tabla.
const COLUMNS: I18nKey[] = [
  'research.col.date', 'research.col.conditions', 'research.col.nct', 'research.col.title',
  'research.col.phase', 'research.col.status', 'research.col.countries', 'research.col.sponsor',
  'research.col.contact', 'research.col.email', 'research.col.emails', 'research.col.stage',
  'research.col.followup', 'research.col.actions',
]

export default function LeadsTab() {
  const { s2, border, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { leads, filterValues, setFilterValue, clearFilters, filteredLeads, openNewLead, setModalImport, handleExport, handlePrint } = useResearch()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Los filtros viven en su propio panel: dejan de flotar sueltos sobre el fondo y se
          entiende que son la barra de herramientas de la tabla de abajo. */}
      <Panel>
        <FilterBar defs={LEAD_FILTERS} items={leads} values={filterValues} onChange={setFilterValue} onClear={clearFilters}
          labelFor={d => t(d.labelKey as I18nKey)}
          clearLabel={t('research.filter.clear')}
          resultsLabel="" /* el conteo vive en la cabecera de la tabla, no repetido acá */
          selectStyle={selectStyle} mutedColor={t3}
          clearStyle={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 11, cursor: 'pointer' }} />
      </Panel>

      {/* Las acciones viven acá y no en el encabezado del módulo: operan sobre ESTA tabla
          (export y PDF salen de `filteredLeads`, o sea de lo que el usuario está viendo). */}
      <Panel flush
        title={t('research.leads.tableTitle')}
        right={<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: accent, background: `${accent}14`, borderRadius: 999, padding: '4px 10px' }}>
            {t('research.filter.results', { n: filteredLeads.length })}
          </span>
          <ToolbarButton primary onClick={openNewLead}>+ {t('research.form.newLead')}</ToolbarButton>
          <ToolbarButton icon="📥" onClick={() => setModalImport(true)}>{t('research.action.import')}</ToolbarButton>
          <ToolbarButton icon="📤" onClick={handleExport}>{t('research.action.export')}</ToolbarButton>
          <ToolbarButton icon="🖨" onClick={handlePrint}>{t('research.action.pdf')}</ToolbarButton>
        </div>}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 1200 }}>
            <thead><tr style={{ background: s2 }}>
              {COLUMNS.map(key =>
                <th key={key} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', borderBottom: `1px solid ${border}`, fontWeight: 400, whiteSpace: 'nowrap' }}>{t(key)}</th>
              )}
            </tr></thead>
            <tbody>{filteredLeads.map(l => <LeadRow key={l.id} lead={l} />)}</tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '44px 20px', color: t3 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: t2, marginBottom: 4 }}>{t('research.leads.emptyTitle')}</div>
            <div style={{ fontSize: 12 }}>{t('research.leads.emptyHint')}</div>
          </div>
        )}
      </Panel>
    </div>
  )
}
