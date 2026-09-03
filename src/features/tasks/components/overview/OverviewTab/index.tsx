'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { StaggerGrid } from '@/shared/motion'
import StatCard from '@/shared/components/dashboard/StatCard'
import Panel from '@/shared/components/dashboard/Panel'
import BarChartCard from '@/shared/components/dashboard/BarChartCard'
import { useTasks } from '@/features/tasks/components/TasksContext'
import StratixFiltersPanel from '../StratixFiltersPanel'
import TeamOnlineRow from '../TeamOnlineRow'
import RecentActivityRow from '../RecentActivityRow'
import TeamRankRow from '../TeamRankRow'
import GanttChart from '@/features/tasks/components/gantt/GanttChart'
import HoursSummaryCard from '@/features/tasks/components/horas/HoursSummaryCard'
import s from './index.module.css'
// Esta vista la monta `/tasks`, así que el «ver todas» apunta al catálogo de ESE módulo.
// El archivo todavía vive acá porque la mudanza de carpetas es la fase 3.
import { TASKS_TAB } from '@/features/tasks/constants/tabs'

// El tablero de Stratix, armado con los MISMOS componentes que el de Research: una cosa es el
// tablero y otra la producción (ver rules/arquitectura.md). Por eso vive en su propia
// sección del sidebar y no como primera pestaña de Production.
//
// Lo que este archivo aporta es el dominio —qué métrica va en cada card, con qué color, y que
// las marcas conserven el suyo— más la grilla. El aspecto de cada bloque es de shared/.
export default function OverviewTab() {
  const { accent, onlineCount } = useApp()
  const { t } = useT()
  const {
    totalQ, completadasQ, enProcesoQ, pendientesQ, pctCompletado, totalHoras, totalDias,
    diasRestantes, horasDisponibles, datosPorMes, datosPorMarca,
    equipoSinMi, actsFiltradas, datosPorMiembro, maxMiembro, setTabActiva, resumenHoras,
    filterValues, setFilterValue,
  } = useTasks()

  const kpis = [
    { label: t('stratix.dash.totalTasks'), value: totalQ, color: accent, footnote: t('stratix.dash.tasks') },
    { label: t('stratix.dash.completed'), value: completadasQ, color: '#34D399', badge: `${pctCompletado}%` },
    { label: t('stratix.dash.inProgress'), value: enProcesoQ, color: '#FBB040' },
    { label: t('stratix.dash.pending'), value: pendientesQ, color: '#9494B3', footnote: t('stratix.dash.notStarted') },
    { label: t('stratix.dash.totalHours'), value: `${totalHoras}h`, color: '#F472B6', footnote: t('stratix.dash.prodDays', { n: totalDias }) },
    { label: t('stratix.dash.availableHours'), value: `${horasDisponibles}h`, color: '#60A5FA', footnote: t('stratix.dash.daysRemaining', { n: diasRestantes }) },
  ]

  // `key` es el valor con el que filtra el clic: la barra dice "Jul" y el filtro guarda "Julio".
  const mesesData = datosPorMes.map(d => ({ name: d.mes, value: d.total, key: d.key }))
  const marcasData = datosPorMarca.map(m => ({ name: m.codigo, value: m.total }))
  // Clic en una barra = filtrar el tablero por ese valor; clic en la que ya está activa = sacarlo.
  // Sin el toggle habría que ir a buscar el desplegable para volver atrás, y el gesto natural
  // después de clickear algo es volver a clickearlo. El mismo filtro está en el panel de arriba,
  // así que la gráfica no es el único camino (ver rules/ui.md).
  const toggle = (key: string) => (v: string) => setFilterValue(key, filterValues[key] === v ? '' : v)
  // El color sale del catálogo de empresas, no de la paleta genérica: una marca desactivada
  // tiene que seguir pintándose como siempre (ver CLAUDE.md, "Marcas del grupo Eminat").
  const marcasColors = Object.fromEntries(datosPorMarca.map(m => [m.codigo, m.color]))
  const recientes = actsFiltradas.slice(0, 6)

  return (
    <div>
      {/* Los filtros mandan sobre TODO el tablero —indicadores, gráficas, Gantt y horas—, no
          sobre un bloque suelto. Reemplazaron a las pills de trimestre, que solo sabían filtrar
          por eso: el trimestre es hoy uno de los cinco desplegables. */}
      <div className={s.fila}><StratixFiltersPanel /></div>

      {/* Dentro de un Panel, como en Research: sueltas, las cards flotan sobre el fondo y la
          fila queda sin rótulo, mientras todo lo demás del tablero sí lo tiene. */}
      <div className={s.fila}>
        <Panel collapsible persistKey="stratix-indicadores" title={t('stratix.dash.indicators')}>
          <StaggerGrid className={s.kpis}>
            {kpis.map(k => (
              <StatCard key={k.label} size="sm" label={k.label} value={k.value} color={k.color} badge={k.badge} footnote={k.footnote} />
            ))}
          </StaggerGrid>
        </Panel>
      </div>

      <div className={s.charts}>
        <BarChartCard persistKey="stratix-months" title={t('stratix.dash.byMonth')} data={mesesData}
          onSelect={toggle('periodo')} selected={filterValues.periodo} />
        <BarChartCard persistKey="stratix-brands" title={t('stratix.dash.byBrand')} data={marcasData} colors={marcasColors} vertical
          onSelect={toggle('empresa')} selected={filterValues.empresa} />
      </div>

      <div className={`${s.activity} ${s.fila}`}>
        <Panel collapsible persistKey="stratix-actividad" title={t('stratix.dash.recent')} flush
          right={<button className={s.viewAll} onClick={() => setTabActiva(TASKS_TAB.SOLICITUDES)}>{t('stratix.dash.viewAll')}</button>}>
          {recientes.map(a => <RecentActivityRow key={a.id} a={a} />)}
        </Panel>
        <div className={s.gente}>
          <Panel collapsible persistKey="stratix-hoy" title={t('stratix.dash.today')} flush
            right={<span className={s.online}>{t('stratix.dash.online', { n: onlineCount > 0 ? onlineCount : 1 })}</span>}>
            <div className={s.people}>
              {equipoSinMi.map(u => <TeamOnlineRow key={String(u.id)} u={u} />)}
            </div>
          </Panel>
          <Panel collapsible persistKey="stratix-ranking" title={t('stratix.dash.ranking')}>
            <div className={s.ranking}>
              {datosPorMiembro.map((m, i) => <TeamRankRow key={m.id} m={m} i={i} maxMiembro={maxMiembro} />)}
            </div>
          </Panel>
        </div>
      </div>

      {/* Los dos bloques largos cierran el tablero. Arriba va lo que se lee de un vistazo —los
          indicadores, las gráficas, quién está y qué pasó—; el Gantt son 18 filas y el resumen
          una tarjeta por persona, así que puestos arriba empujan todo lo demás fuera de la
          pantalla. Los dos se recogen para dejar el tablero en una sola vista. */}
      <div className={s.fila}>
        <Panel collapsible persistKey="stratix-gantt" title={t('stratix.gantt.title')}>
          <GanttChart />
        </Panel>
      </div>

      <div className={s.fila}>
        <Panel collapsible persistKey="stratix-horas" title={t('stratix.hours.teamSummary')}>
          <div className={s.horas}>
            {resumenHoras.map(r => <HoursSummaryCard key={r.id} r={r} />)}
          </div>
        </Panel>
      </div>
    </div>
  )
}
