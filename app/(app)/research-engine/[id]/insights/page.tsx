'use client'
import { useState } from 'react'
import { useProject } from '@/app/components/research-engine/ProjectProvider'
import { generateAIInsights, type Insight } from '@/lib/researchEngine'
import {
  Card, EmptyState, Badge, Modal, Field, Input, Textarea, Select, FormGrid, PrimaryBtn, GhostBtn, ACCENT,
} from '@/app/components/research-engine/ui'

const BLANK = { title: '', category: 'Observación', content: '' }
const AI_FIELDS: { key: keyof Insight; label: string }[] = [
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'market_opportunity', label: 'Market Opportunity' },
  { key: 'competitor_weakness', label: 'Competitor Weakness' },
  { key: 'pricing_recommendation', label: 'Pricing Recommendation' },
  { key: 'positioning_recommendation', label: 'Positioning Recommendation' },
  { key: 'marketing_recommendation', label: 'Marketing Recommendation' },
  { key: 'next_steps', label: 'Next Steps' },
]

export default function InsightsPage() {
  const { project, competitors, pricing, social, sources, insights, add, remove } = useProject()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(BLANK)
  const [generating, setGenerating] = useState(false)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function generateAI() {
    if (!project) return
    setGenerating(true)
    try {
      const insight = generateAIInsights(project, competitors, pricing, social, sources)
      await add('insights', insight)
    } catch (e: any) { alert('Error al generar. ¿Corriste research_engine.sql?\n' + (e?.message || '')) }
    setGenerating(false)
  }

  async function saveManual() {
    if (!form.title.trim()) { alert('Pon un título.'); return }
    try { await add('insights', { source: 'manual', ...form }); setModal(false); setForm(BLANK) }
    catch (e: any) { alert('Error al guardar.\n' + (e?.message || '')) }
  }

  const aiInsights = insights.filter(i => i.source === 'ai')
  const manualInsights = insights.filter(i => i.source !== 'ai')

  return (
    <div>
      <Card title="Insights" subtitle="Insights manuales + generador de IA"
        actions={<>
          <GhostBtn onClick={() => { setForm(BLANK); setModal(true) }}>+ Insight manual</GhostBtn>
          <PrimaryBtn onClick={generateAI} disabled={generating} color={ACCENT.teal}>{generating ? 'Generando…' : '✨ Generate AI Insights'}</PrimaryBtn>
        </>}>
        <div className="rounded-lg bg-gray-50 p-3 text-[11px] text-gray-500">
          El generador analiza {competitors.length} competidores, {pricing.length} precios, {social.length} perfiles sociales y {sources.length} fuentes para producir un insight estructurado.
          <span className="ml-1 font-semibold text-gray-600">(Phase 1: motor heurístico — listo para conectar a Claude después.)</span>
        </div>
      </Card>

      {/* AI insights */}
      {aiInsights.map(ins => (
        <Card key={ins.id} title={ins.title || 'AI Insights'} subtitle={ins.created_at ? new Date(ins.created_at).toLocaleString('es-EC') : ''}
          actions={<><Badge color={ACCENT.teal}>AI</Badge><button onClick={() => confirm('¿Eliminar?') && remove('insights', ins.id)} className="ml-2 rounded px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50">✕</button></>}>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {AI_FIELDS.map(f => ins[f.key] ? (
              <div key={f.key as string} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: ACCENT.teal }}>{f.label}</div>
                <div className="text-xs leading-relaxed text-gray-700">{ins[f.key] as string}</div>
              </div>
            ) : null)}
          </div>
        </Card>
      ))}

      {/* Manual insights */}
      <Card title="Insights manuales" subtitle={`${manualInsights.length} registrados`}>
        {manualInsights.length === 0 ? (
          <EmptyState icon="💡" title="Sin insights manuales" hint="Agrega observaciones del equipo." />
        ) : (
          <div className="flex flex-col gap-3">
            {manualInsights.map(ins => (
              <div key={ins.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="font-bold text-gray-900">{ins.title}</span>{ins.category && <Badge>{ins.category}</Badge>}</div>
                  <button onClick={() => confirm('¿Eliminar?') && remove('insights', ins.id)} className="rounded px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50">✕</button>
                </div>
                <div className="text-xs leading-relaxed text-gray-600">{ins.content}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal && (
        <Modal title="Nuevo insight manual" onClose={() => setModal(false)}
          footer={<><GhostBtn onClick={() => setModal(false)}>Cancelar</GhostBtn><PrimaryBtn onClick={saveManual}>Agregar</PrimaryBtn></>}>
          <FormGrid>
            <Field label="Título" full><Input value={form.title} onChange={e => set('title', e.target.value)} /></Field>
            <Field label="Categoría">
              <Select value={form.category} onChange={e => set('category', e.target.value)}>
                {['Observación', 'Oportunidad', 'Riesgo', 'Recomendación', 'Tendencia'].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Contenido" full><Textarea value={form.content} onChange={e => set('content', e.target.value)} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}
