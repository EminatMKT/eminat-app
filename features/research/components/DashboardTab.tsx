'use client'
import { RESEARCH_THEME } from '../theme'
import { useResearch } from './ResearchContext'
import StatCard from './StatCard'
import Panel from './Panel'
// import CountryChip from './CountryChip' // ponytail: oculto por pedido de dirección (reunión 2026-07-20) — restaurar descomentando esto + el bloque "Leads by Country"
// import RecentLeadItem from './RecentLeadItem' // ponytail: oculto por pedido de dirección — restaurar con el bloque "Recently added leads"
import StagePieChart from './StagePieChart'
import BarChartCard from './BarChartCard'
import { useT } from '@/shared/i18n'
import { useUserPreference } from '@/shared/lib/useUserPreference'

export default function DashboardTab() {
  const { t, locale } = useT()
  const [detalle, setDetalle] = useUserPreference('research-kpi-detail', true)
  const { totalLeads, totalCorreos, cadencia, contactadosConCorreo, nuevos, ganados, sinRespuesta, cargadosEsteMes, stageData, phaseData } = useResearch()
  // El absoluto y el % juntos en la misma card (pedido de Federico, 12/08/2026). El % es el que
  // sostiene la narrativa: "de todo lo que enviamos, no nos han respondido la mitad".
  const pct = (n: number) => `${totalLeads > 0 ? Math.round((n / totalLeads) * 100) : 0}%`
  // Cada parte de la card hace UN trabajo: el rótulo dice qué se cuenta, el badge la proporción,
  // y el pie la base de esa proporción. Se lee de corrido: "2 · 25% · de 8 leads cargados".
  const ofLoaded = t('research.kpi.ofLoadedLeads', { n: totalLeads })
  const mesEnCurso = new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })

  return (
    <div>
      {/* Orden pedido por Federico (12/08/2026), de izquierda a derecha por prioridad de lectura:
          esfuerzo → sin respuesta → contactado → el resto del pipeline → registros únicos al final
          ("ese sería uno de los del final a la derecha"). Los 81 únicos abrían la fila y tapaban
          los ~165-170 alcances reales. Nuevo y Ganado se quedan: en la reunión los dio por buenos
          ("el nuevo ya lo tienes, el contactado lo tienes, el ganado evidentemente está ahí"),
          nunca pidió sacarlos. auto-fit para que la fila baje de renglón antes que apretujarse.
          Van dentro de un Panel para que la fila deje de flotar sobre el fondo y quede rotulada,
          igual que las gráficas de abajo. */}
      <div style={{ marginBottom: 14 }}>
      {/* Sin `right` con la base: cada card ya la lleva en su pie, y a la derecha del título
          quedaba lejos de las cards de ese extremo. Se dice una vez por card, no dos veces.
          El detalle se recoge para TODAS las cards a la vez: si fuera card por card, la fila
          quedaría dispareja y los números dejarían de compararse a la misma altura. */}
      {/* El botón del detalle va con borde y chevron: sin eso se leía como una etiqueta más de
          la cabecera y nadie adivinaba que era un control. */}
      <Panel collapsible persistKey="research-indicators" title={t('research.section.indicators')}
        right={<button type="button" onClick={() => setDetalle(d => !d)} className="tool-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: RESEARCH_THEME.t2, background: RESEARCH_THEME.s1, border: `1px solid ${RESEARCH_THEME.border}` }}>
          <span style={{ fontSize: 8 }}>{detalle ? '▲' : '▼'}</span>
          {detalle ? t('research.section.hideDetail') : t('research.section.showDetail')}
        </button>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 10 }}>
        <StatCard showDetail={detalle} label={t('research.kpi.totalEmails')} value={totalCorreos} color="#F472B6"
          footnote={t('research.kpi.emailsSum')}
          breakdown={{
            caption: t('research.kpi.cadenceCaption'),
            rows: [
              { label: t('research.kpi.cadence1'), value: cadencia.one },
              { label: t('research.kpi.cadence2'), value: cadencia.two },
              { label: t('research.kpi.cadence3'), value: cadencia.threePlus },
            ],
          }} />
        <StatCard showDetail={detalle} label={t('research.stage.sin_respuesta')} value={sinRespuesta} color="#9494B3"
          badge={pct(sinRespuesta)} footnote={ofLoaded} />
        {/* Contactado = leads con ≥1 correo, NO la etapa: es la definición textual de Federico
            (min 12:49). Un lead en `Sin respuesta` con 3 correos también fue contactado. El
            rótulo lleva la aclaración porque si no, la card discrepa del pie sin explicación. */}
        <StatCard showDetail={detalle} label={t('research.kpi.contactedLabel')} value={contactadosConCorreo} color="#FBB040"
          badge={pct(contactadosConCorreo)} footnote={ofLoaded} />
        <StatCard showDetail={detalle} label={t('research.stage.nuevo')} value={nuevos} color="#60A5FA"
          badge={pct(nuevos)} footnote={ofLoaded} />
        <StatCard showDetail={detalle} label={t('research.stage.ganado')} value={ganados} color="#34D399"
          badge={pct(ganados)} footnote={ofLoaded} />
        <StatCard showDetail={detalle} label={t('research.kpi.addedThisMonth')} value={cargadosEsteMes} color="#F59E0B"
          footnote={mesEnCurso} />
        <StatCard showDetail={detalle} label={t('research.kpi.uniqueLeads')} value={totalLeads} color="#7C6FF7"
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
        <StagePieChart data={stageData} />
        <BarChartCard persistKey="research-phases" title={t('research.chart.leadsByPhase')} data={phaseData} />
      </div>

      {/* Oculto por dirección (reunión 2026-07-20) — Top Sponsors + Recently added. Restaurar descomentando + reactivar imports/destructure (sponsorData, leads, RecentLeadItem):
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BarChartCard title="Top Sponsors" data={sponsorData} vertical />
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
