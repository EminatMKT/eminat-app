'use client'
import { useT } from '@/shared/i18n'
import { useCobranzas } from './CobranzasContext'
import { fmt } from '../format'
import { TABLE_HEADERS } from '../constants'
import FilterBar from './FilterBar'
import FilterSelect from './FilterSelect'
import ClearFiltersButton from './ClearFiltersButton'
import KpiRow from './KpiRow'
import ChartsRow from './ChartsRow'
import PieWithLegend from './PieWithLegend'
import VerticalBarChart from './VerticalBarChart'
import DataTable from './DataTable'
import DepositosRow from './DepositosRow'

export default function DepositosTab() {
  const { t } = useT()
  const { cobFiltros, setCobFiltros, clearFilters, depsFilt, totalDep, dep1Q, dep2Q, depBancos, depContratantes, bancosUniq, contratantesUniq } = useCobranzas()
  const kpis = [
    { label: t('cob.kpiTotalDeposited'), value: fmt(totalDep), color: '#34D399' },
    { label: t('cob.kpiDeposits1Q'), value: fmt(dep1Q), color: '#22D3EE' },
    { label: t('cob.kpiDeposits2Q'), value: fmt(dep2Q), color: '#A78BFA' },
    { label: t('cob.kpiRecords'), value: depsFilt.length, color: '#9494B3' },
  ]
  return (
    <div>
      <FilterBar>
        <FilterSelect value={cobFiltros.periodo} onChange={v => setCobFiltros(p => ({ ...p, periodo: v }))}>
          <option value="">{t('cob.allPeriods')}</option>
          <option value="1Q">1Q</option><option value="2Q">2Q</option>
        </FilterSelect>
        <FilterSelect value={cobFiltros.banco} onChange={v => setCobFiltros(p => ({ ...p, banco: v }))}>
          <option value="">{t('cob.allBanks')}</option>
          {bancosUniq.map(b => <option key={String(b)} value={String(b)}>{String(b)}</option>)}
        </FilterSelect>
        <FilterSelect value={cobFiltros.contratante} onChange={v => setCobFiltros(p => ({ ...p, contratante: v }))}>
          <option value="">{t('cob.allContractors')}</option>
          {contratantesUniq.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
        </FilterSelect>
        <ClearFiltersButton onClick={clearFilters} />
      </FilterBar>
      <KpiRow items={kpis} />
      <ChartsRow>
        <PieWithLegend title={t('cob.depositsByBank')} data={depBancos} />
        <VerticalBarChart title={t('cob.depositsByContractor')} data={depContratantes} yWidth={110} />
      </ChartsRow>
      <DataTable headers={TABLE_HEADERS.depositos} empty={depsFilt.length === 0} emptyText={t('cob.noDeposits')}>
        {depsFilt.map((d, i) => <DepositosRow key={d.id || i} deposito={d} />)}
      </DataTable>
    </div>
  )
}
