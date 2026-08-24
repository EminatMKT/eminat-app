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
import DonutPastDue from './DonutPastDue'
import DebtByStudyChart from './DebtByStudyChart'
import DataTable from './DataTable'
import CuentasRow from './CuentasRow'

export default function CuentasTab() {
  const { t } = useT()
  const { cobFiltros, setCobFiltros, clearFilters, cuentasFilt, totalVencido, totalPorVencer, totalAdeudado, cuentasDonut, cuentasEstudios, labsUniqC, estudiosUniqC } = useCobranzas()
  const kpis = [
    { label: t('cob.kpiPastDue'), value: fmt(totalVencido), color: '#F87171' },
    { label: t('cob.kpiUpcoming'), value: fmt(totalPorVencer), color: '#FBB040' },
    { label: t('cob.kpiOwed'), value: fmt(totalAdeudado), color: '#60A5FA' },
    { label: t('cob.kpiRecords'), value: cuentasFilt.length, color: '#9494B3' },
  ]
  return (
    <div>
      <FilterBar>
        <FilterSelect value={cobFiltros.laboratorio} onChange={v => setCobFiltros(p => ({ ...p, laboratorio: v }))}>
          <option value="">{t('cob.allLabs')}</option>
          {labsUniqC.map(l => <option key={String(l)} value={String(l)}>{String(l)}</option>)}
        </FilterSelect>
        <FilterSelect value={cobFiltros.estudio} onChange={v => setCobFiltros(p => ({ ...p, estudio: v }))}>
          <option value="">{t('cob.allStudies')}</option>
          {estudiosUniqC.map(es => <option key={String(es)} value={String(es)}>{String(es)}</option>)}
        </FilterSelect>
        <ClearFiltersButton onClick={clearFilters} />
      </FilterBar>
      <KpiRow items={kpis} />
      <ChartsRow>
        <DonutPastDue data={cuentasDonut} />
        <DebtByStudyChart data={cuentasEstudios} />
      </ChartsRow>
      <DataTable headers={TABLE_HEADERS.cuentas} empty={cuentasFilt.length === 0} emptyText={t('cob.noAccounts')}>
        {cuentasFilt.map((c, i) => <CuentasRow key={c.id || i} cuenta={c} />)}
      </DataTable>
    </div>
  )
}
