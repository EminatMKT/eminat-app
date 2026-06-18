'use client'
import { useState } from 'react'
import { useProject } from '@/app/components/research-engine/ProjectProvider'
import { money, type Pricing } from '@/lib/researchEngine'
import {
  Card, KPI, TableWrap, Th, Td, Tr, EmptyState,
  Modal, Field, Input, Textarea, Select, FormGrid, PrimaryBtn, GhostBtn, ACCENT,
} from '@/app/components/research-engine/ui'

const BLANK = { competitor_id: '', service_name: '', price: '', unit: 'por sesión', notes: '' }

export default function PricingPage() {
  const { pricing, competitors, add, update, remove } = useProject()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Pricing | null>(null)
  const [form, setForm] = useState<any>(BLANK)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const compName = (id?: string | null) => competitors.find(c => c.id === id)?.name || '—'

  const prices = pricing.map(p => Number(p.price)).filter(n => n > 0)
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

  function openNew() { setEditing(null); setForm(BLANK); setModal(true) }
  function openEdit(p: Pricing) { setEditing(p); setForm({ ...BLANK, ...p, competitor_id: p.competitor_id || '' }); setModal(true) }

  async function save() {
    const row = { ...form, price: Number(form.price) || null, competitor_id: form.competitor_id || null }
    try {
      if (editing) await update('pricing', editing.id, row)
      else await add('pricing', row)
      setModal(false)
    } catch (e: any) { alert('Error al guardar. ¿Corriste research_engine.sql?\n' + (e?.message || '')) }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <KPI label="Precio mínimo" value={min ? money(min) : '—'} accent={ACCENT.green} />
        <KPI label="Precio promedio" value={avg ? money(avg) : '—'} accent={ACCENT.purple} />
        <KPI label="Precio máximo" value={max ? money(max) : '—'} accent={ACCENT.red} />
        <KPI label="Entradas" value={pricing.length} accent={ACCENT.blue} />
      </div>

      <Card title="Pricing Intelligence" subtitle={`${pricing.length} entradas de precio`}
        actions={<PrimaryBtn onClick={openNew}>+ Pricing</PrimaryBtn>}>
        {pricing.length === 0 ? (
          <EmptyState icon="💲" title="Sin datos de precios" hint="Agrega precios observados de la competencia." />
        ) : (
          <TableWrap>
            <thead><tr><Th>Servicio</Th><Th>Competidor</Th><Th align="right">Precio</Th><Th>Unidad</Th><Th>Notas</Th><Th align="right">Acciones</Th></tr></thead>
            <tbody>
              {pricing.map(p => (
                <Tr key={p.id}>
                  <Td bold>{p.service_name || '—'}</Td>
                  <Td color="#6b7280">{compName(p.competitor_id)}</Td>
                  <Td align="right" mono bold color={ACCENT.green}>{p.price != null ? money(p.price) : '—'}</Td>
                  <Td color="#6b7280">{p.unit || '—'}</Td>
                  <Td color="#6b7280">{p.notes || '—'}</Td>
                  <Td align="right">
                    <button onClick={() => openEdit(p)} className="mr-1 rounded px-2 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-50">Editar</button>
                    <button onClick={() => confirm('¿Eliminar?') && remove('pricing', p.id)} className="rounded px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50">✕</button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {modal && (
        <Modal title={editing ? 'Editar precio' : 'Nuevo precio'} onClose={() => setModal(false)}
          footer={<><GhostBtn onClick={() => setModal(false)}>Cancelar</GhostBtn><PrimaryBtn onClick={save}>{editing ? 'Guardar' : 'Agregar'}</PrimaryBtn></>}>
          <FormGrid>
            <Field label="Servicio / Producto" full><Input value={form.service_name} onChange={e => set('service_name', e.target.value)} /></Field>
            <Field label="Competidor">
              <Select value={form.competitor_id} onChange={e => set('competitor_id', e.target.value)}>
                <option value="">— Sin asignar —</option>
                {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Precio (USD)"><Input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} /></Field>
            <Field label="Unidad"><Input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="por sesión / mes / flat" /></Field>
            <Field label="Notas" full><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}
