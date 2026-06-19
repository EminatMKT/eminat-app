'use client'
import { useCobranzas } from './CobranzasContext'
import { fmt } from '../format'
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
  const { cobFiltros, setCobFiltros, clearFilters, depsFilt, totalDep, dep1Q, dep2Q, depBancos, depContratantes, bancosUniq, contratantesUniq } = useCobranzas()
  return (
    <div>
      <FilterBar>
        <FilterSelect value={cobFiltros.periodo} onChange={v => setCobFiltros(p => ({ ...p, periodo: v }))}>
          <option value="">All Periods</option>
          <option value="1Q">1Q</option><option value="2Q">2Q</option>
        </FilterSelect>
        <FilterSelect value={cobFiltros.banco} onChange={v => setCobFiltros(p => ({ ...p, banco: v }))}>
          <option value="">All Banks</option>
          {bancosUniq.map(b => <option key={String(b)} value={String(b)}>{String(b)}</option>)}
        </FilterSelect>
        <FilterSelect value={cobFiltros.contratante} onChange={v => setCobFiltros(p => ({ ...p, contratante: v }))}>
          <option value="">All Contractors</option>
          {contratantesUniq.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
        </FilterSelect>
        <ClearFiltersButton onClick={clearFilters} />
      </FilterBar>
      <KpiRow items={[
        { label: 'Total Deposited', value: fmt(totalDep), color: '#34D399' },
        { label: 'Deposits 1Q', value: fmt(dep1Q), color: '#22D3EE' },
        { label: 'Deposits 2Q', value: fmt(dep2Q), color: '#A78BFA' },
        { label: 'Records', value: depsFilt.length, color: '#9494B3' },
      ]} />
      <ChartsRow>
        <PieWithLegend title="Deposits by Bank" data={depBancos} />
        <VerticalBarChart title="Deposits by Contractor" data={depContratantes} yWidth={110} />
      </ChartsRow>
      <DataTable headers={['Period', 'Contractor', 'Bank', 'ID', 'Study', 'Deposited']} empty={depsFilt.length === 0} emptyText="No deposits recorded">
        {depsFilt.map((d, i) => <DepositosRow key={d.id || i} deposito={d} />)}
      </DataTable>
    </div>
  )
}
