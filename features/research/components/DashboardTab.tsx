'use client'
import { RESEARCH_THEME } from '../theme'
import { LEAD_FILTERS } from '../utils/filters'
import { useResearch } from './ResearchContext'
import StatCard from './StatCard'
import Panel from './Panel'
// import CountryChip from './CountryChip' // ponytail: oculto por pedido de dirección (reunión 2026-07-20) — restaurar descomentando esto + el bloque "Leads by Country"
// import RecentLeadItem from './RecentLeadItem' // ponytail: oculto por pedido de dirección — restaurar con el bloque "Recently added leads"
import FiltersPanel from './FiltersPanel'
import StagePieChart from './StagePieChart'
import BarChartCard from './BarChartCard'
import { useT } from '@/shared/i18n'

export default function DashboardTab() {
  const { t, locale } = useT()
  const { totalLeads, totalCorreos, cadencia, contactadosConCorreo, nuevos, ganados, sinRespuesta, cargadosEsteMes, stageData, phaseData, specialtyData, filterValues, setFilterValue, clearFilters } = useResearch()
  // El absoluto y el % juntos en la misma card (pedido de Federico, 12/08/2026). El % es el que
  // sostiene la narrativa: "de todo lo que enviamos, no nos han respondido la mitad".
  const pct = (n: number) => `${totalLeads > 0 ? Math.round((n / totalLeads) * 100) : 0}%`
  // Cada parte de la card hace UN trabajo: el rótulo dice qué se cuenta, el badge la proporción,
  // y el pie la base de esa proporción. Se lee de corrido: "2 · 25% · de 8 leads cargados".
  const ofLoaded = t('research.kpi.ofLoadedLeads', { n: totalLeads })
  const activos = LEAD_FILTERS.filter(d => filterValues[d.key]).length
  const { accent } = RESEARCH_THEME
  const mesEnCurso = new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })
  // Clic en una barra/porción = filtrar el tablero por ese valor; clic en la que ya está activa
  // = sacarlo. Sin el toggle, para volver atrás habría que ir a buscar el desplegable — y el
  // gesto natural después de clickear algo es volver a clickearlo.
  const toggle = (key: string) => (v: string) => setFilterValue(key, filterValues[key] === v ? '' : v)

  return (
    <div>
      {/* Los filtros mandan sobre TODO el tablero, no solo sobre la tabla: es el mismo estado
          del contexto, así que lo que se filtre acá sigue puesto al pasar a Leads. */}
      <div style={{ marginBottom: 14 }}><FiltersPanel /></div>
      {/* Orden pedido por Federico (12/08/2026), de izquierda a derecha por prioridad de lectura:
          esfuerzo → sin respuesta → contactado → el resto del pipeline → registros únicos al final
          ("ese sería uno de los del final a la derecha"). Los 81 únicos abrían la fila y tapaban
          los ~165-170 alcances reales. Nuevo y Ganado se quedan: en la reunión los dio por buenos
          ("el nuevo ya lo tienes, el contactado lo tienes, el ganado evidentemente está ahí"),
          nunca pidió sacarlos. auto-fit para que la fila baje de renglón antes que apretujarse.
          Van dentro de un Panel para que la fila deje de flotar sobre el fondo y quede rotulada,
          igual que las gráficas de abajo. */}
      <div style={{ marginBottom: 14 }}>
      {/* La base del % sube al encabezado: al sacarle el pie a las cards de etapa, era el único
          lugar donde seguía dicho sobre qué está calculado ese "25%". Acá se dice una sola vez
          para toda la sección, que es lo que es. */}
      {/* El aviso de filtrado va PEGADO a los KPIs y no solo arriba en el panel de filtros: al
          scrollear hasta acá —que es donde se pasa la presentación— el chip de "activos" queda
          fuera de pantalla, y los filtros sin gráfica (fecha, país, sponsor, NCT#) no tienen
          ninguna otra señal. Sumado a que los filtros se recuerdan entre sesiones, sin esto hay
          un camino real a proyectar 34 leads creyendo que son 81. Es clickeable: limpia todo. */}
      <Panel collapsible persistKey="research-indicators" title={t('research.section.indicators')}
        right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {activos > 0 && (
            <button onClick={clearFilters} title={t('research.filter.clear')}
              style={{ fontFamily: 'DM Mono', fontSize: 10, color: accent, background: `${accent}14`, border: `1px solid ${accent}55`, borderRadius: 999, padding: '4px 10px', cursor: 'pointer' }}>
              {t('research.kpi.filtered', { n: activos })} ✕
            </button>
          )}
          <span style={{ fontSize: 10, color: RESEARCH_THEME.t3, fontFamily: 'DM Mono' }}>{ofLoaded}</span>
        </span>}>
      {/* alignItems:start — al desplegar el detalle de una card, las otras no tienen por qué
          estirarse con ella y quedar con un hueco blanco al pie. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 10, alignItems: 'start' }}>
        <StatCard detailKey="kpi-emails" label={t('research.kpi.totalEmails')} value={totalCorreos} color="#F472B6"
          footnote={t('research.kpi.emailsSum')}
          breakdown={{
            caption: t('research.kpi.cadenceCaption'),
            rows: [
              { label: t('research.kpi.cadence1'), value: cadencia.one },
              { label: t('research.kpi.cadence2'), value: cadencia.two },
              { label: t('research.kpi.cadence3'), value: cadencia.threePlus },
            ],
          }} />
        <StatCard label={t('research.stage.sin_respuesta')} value={sinRespuesta} color="#9494B3" badge={pct(sinRespuesta)} />
        {/* Contactado = leads con ≥1 correo, NO la etapa: es la definición textual de Federico
            (min 12:49). Un lead en `Sin respuesta` con 3 correos también fue contactado. El
            rótulo lleva la aclaración porque si no, la card discrepa del pie sin explicación. */}
        <StatCard label={t('research.kpi.contactedLabel')} value={contactadosConCorreo} color="#FBB040" badge={pct(contactadosConCorreo)} />
        <StatCard label={t('research.stage.nuevo')} value={nuevos} color="#60A5FA" badge={pct(nuevos)} />
        <StatCard label={t('research.stage.ganado')} value={ganados} color="#34D399" badge={pct(ganados)} />
        <StatCard label={t('research.kpi.addedThisMonth')} value={cargadosEsteMes} color="#F59E0B" badge={mesEnCurso} badgeNeutral />
        <StatCard detailKey="kpi-unique" label={t('research.kpi.uniqueLeads')} value={totalLeads} color="#7C6FF7"
          footnote={t('research.kpi.uniqueNct')} />
      </div>
      </Panel>
      </div>

      {/* Oculto por dirección (reunión 2026-07-20) — restaurar descomentando + reactivar imports/destructure de countrySorted:
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads by Country</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {countrySorted.map(([country, count]) => <CountryChip key={country} country={country} count={count} />)}
          {countrySorted.length === 0 && <span style={{ color: t3, fontSize: 12 }}>No country data</span>}
        </div>
      </div>
      */}

      {/* alignItems:start — si no, recoger una gráfica deja un hueco del alto de su vecina
          abierta, porque el grid iguala alturas por fila. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, alignItems: 'start' }}>
        <StagePieChart data={stageData} onSelect={toggle('stage')} selected={filterValues.stage} />
        <BarChartCard persistKey="research-phases" title={t('research.chart.leadsByPhase')} data={phaseData} onSelect={toggle('phase')} selected={filterValues.phase} />
      </div>

      {/* Por especialidad va en barras HORIZONTALES y no verticales como fase: "Gastroenterología"
          no entra bajo una barra de 60px sin cortarse ni rotarse. Mismo motivo por el que Top
          Sponsors usa vertical. Ocupa el ancho completo porque la lista es larga (15 + los sin
          clasificar) y es el gráfico que se lleva a la conversación con la farmacéutica. */}
      <div style={{ marginBottom: 14 }}>
        <BarChartCard persistKey="research-specialties" title={t('research.chart.leadsBySpecialty')} data={specialtyData} vertical height={320} onSelect={toggle('specialty')} selected={filterValues.specialty} />
      </div>

      {/* Oculto por dirección (reunión 2026-07-20) — Top Sponsors + Recently added. Restaurar descomentando + reactivar imports/destructure (sponsorData, leads, RecentLeadItem):
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BarChartCard persistKey="research-sponsors" title={t('research.chart.topSponsors')} data={sponsorData} vertical />
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, fontSize: 12, fontWeight: 600, color: t1 }}>Recently added leads</div>
          {leads.slice(0, 5).map(l => <RecentLeadItem key={l.id} lead={l} />)}
          {leads.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: t3, fontSize: 12 }}>No leads</div>}
        </div>
      </div>
      */}
    </div>
  )
}
