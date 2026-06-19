'use client'
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
import VentasRow from './VentasRow'

export default function VentasTab() {
  const { cobFiltros, setCobFiltros, clearFilters, ventasFilt, totalVentas, ventas1Q, ventas2Q, ventasLabs, ventasEstudios, labsUniq, estudiosUniqV } = useCobranzas()
  const kpis = [
    { label: 'Total Sales', value: fmt(totalVentas), color: '#34D399' },
    { label: 'Sales 1Q', value: fmt(ventas1Q), color: '#60A5FA' },
    { label: 'Sales 2Q', value: fmt(ventas2Q), color: '#A78BFA' },
    { label: 'Records', value: ventasFilt.length, color: '#FB923C' },
  ]
  return (
    <div>
      <FilterBar>
        <FilterSelect value={cobFiltros.periodo} onChange={v => setCobFiltros(p => ({ ...p, periodo: v }))}>
          <option value="">All Periods</option>
          <option value="1Q">1Q</option><option value="2Q">2Q</option>
        </FilterSelect>
        <FilterSelect value={cobFiltros.laboratorio} onChange={v => setCobFiltros(p => ({ ...p, laboratorio: v }))}>
          <option value="">All Labs</option>
          {labsUniq.map(l => <option key={String(l)} value={String(l)}>{String(l)}</option>)}
        </FilterSelect>
        <FilterSelect value={cobFiltros.estudio} onChange={v => setCobFiltros(p => ({ ...p, estudio: v }))}>
          <option value="">All Studies</option>
          {estudiosUniqV.map(es => <option key={String(es)} value={String(es)}>{String(es)}</option>)}
        </FilterSelect>
        <ClearFiltersButton onClick={clearFilters} />
      </FilterBar>
      <KpiRow items={kpis} />
      <ChartsRow>
        <PieWithLegend title="Sales by Lab" data={ventasLabs} />
        <VerticalBarChart title="Sales by Study" data={ventasEstudios} yWidth={100} />
      </ChartsRow>
      <DataTable headers={TABLE_HEADERS.ventas} empty={ventasFilt.length === 0} emptyText="No sales records">
        {ventasFilt.map((v, i) => <VentasRow key={v.id || i} venta={v} />)}
      </DataTable>
    </div>
  )
}
