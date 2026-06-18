'use client'
import { useProject } from '@/app/components/research-engine/ProjectProvider'
import { money, buildReport } from '@/lib/researchEngine'
import {
  Card, ScoreCard, KPI, TableWrap, Th, Td, Tr, Stars, Badge, EmptyState,
  PrimaryBtn, GhostBtn, ACCENT,
} from '@/app/components/research-engine/ui'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: ACCENT.purple }}>{n}</span>
        <span className="text-base font-bold text-gray-900">{title}</span>
      </div>
      {children}
    </Card>
  )
}
function Prose({ text, placeholder }: { text?: string; placeholder: string }) {
  return text
    ? <p className="text-sm leading-relaxed text-gray-700">{text}</p>
    : <p className="text-sm italic text-gray-400">{placeholder}</p>
}

export default function ReportPage() {
  const { project, competitors, pricing, social, sources, insights, metrics } = useProject()
  if (!project) return null
  const report = buildReport({ project, metrics, competitors, pricing, social, insights, sources })
  const hasAI = insights.some(i => i.source === 'ai')

  const exportPlaceholder = (fmt: string) => alert(`Export ${fmt}: placeholder (Phase 2). El layout del reporte ya está listo para conectar la generación de archivos.`)
  const strongest = [...competitors].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)).slice(0, 3)

  return (
    <div>
      {/* Export bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <div className="text-base font-bold text-gray-900">{report.title}</div>
          <div className="text-xs text-gray-500">{project.city}, {project.state} · {project.year_start}–{project.year_end}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryBtn onClick={() => window.print()} color={ACCENT.purple}>🖨 Print / PDF</PrimaryBtn>
          <GhostBtn onClick={() => exportPlaceholder('PDF')}>Export PDF</GhostBtn>
          <GhostBtn onClick={() => exportPlaceholder('DOCX')}>Export DOCX</GhostBtn>
          <GhostBtn onClick={() => exportPlaceholder('CSV')}>Export CSV</GhostBtn>
        </div>
      </div>

      {!hasAI && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          💡 Aún no generas insights de IA. Ve a <b>Insights → Generate AI Insights</b> para llenar las secciones narrativas del reporte.
        </div>
      )}

      <div id="reporte-content">
        <Section n={1} title="Executive Summary">
          <Prose text={report.executive_summary} placeholder="Genera los AI Insights para poblar esta sección." />
        </Section>

        <Section n={2} title="Market Overview">
          <div className="mb-3 flex flex-wrap gap-3">
            <KPI label="Opportunity" value={metrics.opportunityScore} accent={ACCENT.green} />
            <KPI label="Demand" value={metrics.demandScore} accent={ACCENT.blue} />
            <KPI label="Competition" value={metrics.competitionScore} accent={ACCENT.yellow} />
            <KPI label="Risk" value={metrics.riskScore} accent={ACCENT.red} />
          </div>
          <p className="text-sm text-gray-700">
            {metrics.competitorCount} competidores en {project.city}, {project.state} (radio {project.radius || '—'} mi).
            Rating promedio {metrics.avgRating ? metrics.avgRating.toFixed(1) + '★' : '—'}, {metrics.avgReviews || '—'} reviews promedio.
            Rango de precios {metrics.priceMin ? `${money(metrics.priceMin)}–${money(metrics.priceMax)}` : '—'}.
          </p>
        </Section>

        <Section n={3} title="Competitor Analysis">
          {competitors.length === 0 ? <EmptyState icon="🏢" title="Sin competidores" /> : (
            <TableWrap>
              <thead><tr><Th>Nombre</Th><Th>Categoría</Th><Th align="right">Rating</Th><Th align="right">Reviews</Th><Th align="center">Precio</Th></tr></thead>
              <tbody>{competitors.map(c => (
                <Tr key={c.id}><Td bold>{c.name}</Td><Td>{c.category || '—'}</Td><Td align="right"><Stars rating={c.rating} /></Td><Td align="right" mono>{c.review_count || '—'}</Td><Td align="center">{c.price_level || '—'}</Td></Tr>
              ))}</tbody>
            </TableWrap>
          )}
        </Section>

        <Section n={4} title="Pricing Intelligence">
          <Prose text={report.pricing_recommendation} placeholder="Recomendación de precios pendiente de IA." />
          {pricing.length > 0 && (
            <div className="mt-3">
              <TableWrap>
                <thead><tr><Th>Servicio</Th><Th align="right">Precio</Th><Th>Unidad</Th></tr></thead>
                <tbody>{pricing.map(p => <Tr key={p.id}><Td bold>{p.service_name || '—'}</Td><Td align="right" mono color={ACCENT.green}>{p.price != null ? money(p.price) : '—'}</Td><Td color="#6b7280">{p.unit || '—'}</Td></Tr>)}</tbody>
              </TableWrap>
            </div>
          )}
        </Section>

        <Section n={5} title="Social Media Insights">
          {social.length === 0 ? <p className="text-sm italic text-gray-400">Sin perfiles sociales.</p> : (
            <TableWrap>
              <thead><tr><Th>Plataforma</Th><Th>Handle</Th><Th align="right">Seguidores</Th><Th align="right">Engagement</Th></tr></thead>
              <tbody>{social.map(s => <Tr key={s.id}><Td><Badge>{s.platform}</Badge></Td><Td bold>{s.handle || '—'}</Td><Td align="right" mono>{s.followers != null ? Number(s.followers).toLocaleString('en-US') : '—'}</Td><Td align="right" mono>{s.engagement_rate != null ? s.engagement_rate + '%' : '—'}</Td></Tr>)}</tbody>
            </TableWrap>
          )}
        </Section>

        <Section n={6} title="Opportunities">
          <Prose text={report.market_opportunity} placeholder="Oportunidades pendientes de IA." />
        </Section>

        <Section n={7} title="Risks">
          <div className="mb-3 max-w-xs"><ScoreCard label="Risk Score" value={metrics.riskScore} /></div>
          <Prose text={report.competitor_weakness} placeholder="Análisis de amenazas pendiente de IA." />
          {strongest.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">Competidores más fuertes: {strongest.map(c => `${c.name}${c.rating ? ` (${Number(c.rating)}★)` : ''}`).join(', ')}.</p>
          )}
        </Section>

        <Section n={8} title="Recommendations">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {[
              { label: 'Positioning', text: report.positioning_recommendation },
              { label: 'Pricing', text: report.pricing_recommendation },
              { label: 'Marketing', text: report.marketing_recommendation },
              { label: 'Next Steps', text: report.next_steps },
            ].map(r => (
              <div key={r.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: ACCENT.purple }}>{r.label}</div>
                <Prose text={r.text} placeholder="Pendiente de IA." />
              </div>
            ))}
          </div>
        </Section>

        <Section n={9} title="Sources">
          {sources.length === 0 ? <p className="text-sm italic text-gray-400">Sin fuentes citadas.</p> : (
            <ol className="list-decimal pl-5 text-xs text-gray-700">
              {sources.map(s => <li key={s.id} className="mb-1">{s.title} {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-500">({s.url})</a>} {s.type && <span className="text-gray-400">· {s.type}</span>}</li>)}
            </ol>
          )}
        </Section>
      </div>
    </div>
  )
}
