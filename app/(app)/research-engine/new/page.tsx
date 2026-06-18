'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { createProject, FL_CITIES, US_STATE_OPTIONS, INDUSTRIES } from '@/lib/researchEngine'
import { PageHeader, Card, Field, Input, Select, Textarea, Checkbox, FormGrid, PrimaryBtn, GhostBtn } from '@/app/components/research-engine/ui'

const THIS_YEAR = 2026

export default function NewResearchProject() {
  const router = useRouter()
  const { usuario } = useApp()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    name: '', product_service: '', industry: INDUSTRIES[0], location: '',
    city: FL_CITIES[0], state: 'FL', radius: 10, target_audience: '',
    year_start: THIS_YEAR, year_end: THIS_YEAR, status: 'active',
    include_social: true, include_pricing: true, include_report: true,
  })
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name.trim()) { alert('El nombre del proyecto es obligatorio.'); return }
    setSaving(true)
    try {
      const created = await createProject({
        ...form,
        radius: Number(form.radius) || null,
        year_start: Number(form.year_start) || null,
        year_end: Number(form.year_end) || null,
        created_by: usuario?.email || null,
      })
      router.push(`/research-engine/${created.id}`)
    } catch (e: any) {
      setSaving(false)
      alert('No se pudo crear el proyecto. ¿Corriste research_engine.sql en Supabase?\n\n' + (e?.message || ''))
    }
  }

  return (
    <AppShell>
      <div className="-mx-6 -my-5 min-h-full bg-gray-50 px-7 py-6">
        <PageHeader title="New Research Project" subtitle="Define el alcance de tu investigación de mercado local"
          actions={<GhostBtn onClick={() => router.push('/research-engine')}>← Volver</GhostBtn>} />

        <div className="mx-auto max-w-3xl">
          <Card title="Detalles del proyecto">
            <FormGrid>
              <Field label="Project Name" full><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ej. Med Spa Miramar — H1 2026" /></Field>
              <Field label="Product / Service"><Input value={form.product_service} onChange={e => set('product_service', e.target.value)} placeholder="ej. Tratamientos faciales" /></Field>
              <Field label="Industry">
                <Select value={form.industry} onChange={e => set('industry', e.target.value)}>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </Select>
              </Field>
              <Field label="Location (descripción)" full><Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="ej. Sur de Florida — área metropolitana de Miami" /></Field>
              <Field label="City">
                <Select value={form.city} onChange={e => set('city', e.target.value)}>
                  {FL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="State">
                <Select value={form.state} onChange={e => set('state', e.target.value)}>
                  {US_STATE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
              <Field label="Radius (millas)"><Input type="number" value={form.radius} onChange={e => set('radius', e.target.value)} /></Field>
              <Field label="Target Audience"><Input value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder="ej. Mujeres 25-45, ingresos medios-altos" /></Field>
              <Field label="Year Start"><Input type="number" value={form.year_start} onChange={e => set('year_start', e.target.value)} /></Field>
              <Field label="Year End"><Input type="number" value={form.year_end} onChange={e => set('year_end', e.target.value)} /></Field>
            </FormGrid>

            <div className="mt-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Alcance del análisis</div>
              <div className="grid grid-cols-3 gap-2">
                <Checkbox label="Social Media Analysis" checked={form.include_social} onChange={v => set('include_social', v)} />
                <Checkbox label="Pricing Research" checked={form.include_pricing} onChange={v => set('include_pricing', v)} />
                <Checkbox label="Report Generation" checked={form.include_report} onChange={v => set('include_report', v)} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <GhostBtn onClick={() => router.push('/research-engine')}>Cancelar</GhostBtn>
              <PrimaryBtn onClick={save} disabled={saving}>{saving ? 'Creando…' : 'Crear proyecto'}</PrimaryBtn>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
