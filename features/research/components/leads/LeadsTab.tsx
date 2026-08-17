'use client'
import { RESEARCH_THEME, selectStyle } from '../../theme'
import { useT, type I18nKey } from '@/shared/i18n'
import FilterBar from '@/shared/components/FilterBar'
import { LEAD_FILTERS } from '../../utils/filters'
import { useResearch } from '../ResearchContext'
import LeadRow from './LeadRow'

export default function LeadsTab() {
  const { s1, s2, border, t3 } = RESEARCH_THEME
  const { t } = useT()
  const { leads, filterValues, setFilterValue, clearFilters, filteredLeads } = useResearch()
  return (
    <div>
      <FilterBar defs={LEAD_FILTERS} items={leads} values={filterValues} onChange={setFilterValue} onClear={clearFilters}
        labelFor={d => t(d.labelKey as I18nKey)}
        clearLabel={t('research.filter.clear')}
        resultsLabel={t('research.filter.results', { n: filteredLeads.length })}
        selectStyle={selectStyle} mutedColor={t3}
        clearStyle={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer' }} />
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1200 }}>
            <thead><tr style={{ background: s2 }}>
              {['Date', 'Conditions', 'NCT#', 'Title', 'Phase', 'Status', 'Countries', 'Sponsor', 'Contact', 'Email', 'Emails', 'Stage', 'Follow-up', 'Actions'].map(h =>
                <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 9, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400, whiteSpace: 'nowrap' }}>{h}</th>
              )}
            </tr></thead>
            <tbody>{filteredLeads.map(l => <LeadRow key={l.id} lead={l} />)}</tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>No leads found</div>}
      </div>
    </div>
  )
}
