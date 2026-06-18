'use client'
import { useState } from 'react'
import { useProject } from '@/app/components/research-engine/ProjectProvider'
import { money } from '@/lib/researchEngine'
import {
  Card, KPI, ScoreCard, Stars, Badge, TableWrap, Th, Td, Tr, EmptyState,
  Modal, Field, Input, Select, FormGrid, PrimaryBtn, GhostBtn, ACCENT,
} from '@/app/components/research-engine/ui'

export default function ProjectDashboard() {
  const { project, competitors, pricing, social, demographics, metrics, add } = useProject()
  const [demoModal, setDemoModal] = useState(false)
  const [demo, setDemo] = useState<any>({ metric: 'population', label: '', value: '', source: '' })

  const topCompetitors = [...competitors].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)).slice(0, 5)
  const priceRange = metrics.priceMin ? `${money(metrics.priceMin)} – ${money(metrics.priceMax)}` : '—'

  async function saveDemo() {
    if (!demo.label) { alert('Pon una etiqueta.'); return }
    await add('demographics', { ...demo, value: Number(demo.value) || null })
    setDemoModal(false); setDemo({ metric: 'population', label: '', value: '', source: '' })
  }

  return (
    <div>
      {/* Market overview KPIs */}
      <div className="mb-4 flex flex-wrap gap-3">
        <KPI label="Competidores" value={metrics.competitorCount} accent={ACCENT.purple} />
        <KPI label="Rating promedio" value={metrics.avgRating ? `★ ${metrics.avgRating.toFixed(1)}` : '—'} accent={ACCENT.yellow} />
        <KPI label="Reviews promedio" value={metrics.avgReviews || '—'} accent={ACCENT.blue} />
        <KPI label="Rango de precios" value={priceRange} accent={ACCENT.green} />
        <KPI label="Presencia social" value={metrics.socialCount} accent={ACCENT.pink} hint="perfiles rastreados" />
      </div>

      {/* Scores */}
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <ScoreCard label="Opportunity Score" value={metrics.opportunityScore} hint="demanda alta + baja competencia" />
        <ScoreCard label="Demand Score" value={metrics.demandScore} hint="volumen de mercado estimado" />
        <ScoreCard label="Competition Score" value={metrics.competitionScore} hint="densidad y fuerza rival" />
        <ScoreCard label="Risk Score" value={metrics.riskScore} hint="riesgo de entrada" />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {/* Market demographics */}
        <Card title="Market Overview" subtitle={`${project?.city || ''} ${project?.state || ''} · datos demográficos`}
          actions={<GhostBtn onClick={() => setDemoModal(true)}>+ Dato</GhostBtn>}>
          {demographics.length === 0 ? (
            <EmptyState icon="🏙️" title="Sin datos demográficos" hint="Agrega población, ingreso medio, edad media…" />
          ) : (
            <TableWrap>
              <thead><tr><Th>Métrica</Th><Th align="right">Valor</Th><Th>Fuente</Th></tr></thead>
              <tbody>
                {demographics.map(d => (
                  <Tr key={d.id}>
                    <Td bold>{d.label || d.metric}</Td>
                    <Td align="right" mono>{d.value != null ? Number(d.value).toLocaleString('en-US') : '—'}</Td>
                    <Td color="#6b7280">{d.source || '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        {/* Top competitors */}
        <Card title="Top Competitors" subtitle="Por rating">
          {topCompetitors.length === 0 ? (
            <EmptyState icon="🏢" title="Sin competidores" hint="Agrégalos en la pestaña Competitors." />
          ) : (
            <TableWrap>
              <thead><tr><Th>Nombre</Th><Th>Categoría</Th><Th align="right">Rating</Th><Th align="right">Reviews</Th></tr></thead>
              <tbody>
                {topCompetitors.map(c => (
                  <Tr key={c.id}>
                    <Td bold>{c.name}</Td>
                    <Td>{c.category ? <Badge>{c.category}</Badge> : '—'}</Td>
                    <Td align="right"><Stars rating={c.rating} /></Td>
                    <Td align="right" mono color="#6b7280">{c.review_count || '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </div>

      {demoModal && (
        <Modal title="Agregar dato demográfico" onClose={() => setDemoModal(false)}
          footer={<><GhostBtn onClick={() => setDemoModal(false)}>Cancelar</GhostBtn><PrimaryBtn onClick={saveDemo}>Guardar</PrimaryBtn></>}>
          <FormGrid>
            <Field label="Métrica">
              <Select value={demo.metric} onChange={e => setDemo({ ...demo, metric: e.target.value })}>
                {['population', 'median_income', 'median_age', 'households', 'growth_rate', 'other'].map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Etiqueta"><Input value={demo.label} onChange={e => setDemo({ ...demo, label: e.target.value })} placeholder="ej. Población" /></Field>
            <Field label="Valor"><Input type="number" value={demo.value} onChange={e => setDemo({ ...demo, value: e.target.value })} /></Field>
            <Field label="Fuente"><Input value={demo.source} onChange={e => setDemo({ ...demo, source: e.target.value })} placeholder="ej. US Census 2020" /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}
