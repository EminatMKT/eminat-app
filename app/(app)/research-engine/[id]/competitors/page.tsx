'use client'
import { useState } from 'react'
import { useProject } from '@/app/components/research-engine/ProjectProvider'
import { PRICE_LEVELS, type Competitor } from '@/lib/researchEngine'
import {
  Card, TableWrap, Th, Td, Tr, EmptyState, Stars, Badge,
  Modal, Field, Input, Textarea, Select, FormGrid, PrimaryBtn, GhostBtn,
} from '@/app/components/research-engine/ui'

const BLANK = { name: '', website: '', address: '', category: '', rating: '', review_count: '', price_level: '$$', strengths: '', weaknesses: '', notes: '' }

export default function CompetitorsPage() {
  const { competitors, add, update, remove } = useProject()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Competitor | null>(null)
  const [form, setForm] = useState<any>(BLANK)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  function openNew() { setEditing(null); setForm(BLANK); setModal(true) }
  function openEdit(c: Competitor) { setEditing(c); setForm({ ...BLANK, ...c }); setModal(true) }

  async function save() {
    if (!form.name.trim()) { alert('El nombre es obligatorio.'); return }
    const row = { ...form, rating: Number(form.rating) || null, review_count: Number(form.review_count) || null }
    try {
      if (editing) await update('competitors', editing.id, row)
      else await add('competitors', row)
      setModal(false)
    } catch (e: any) { alert('Error al guardar. ¿Corriste research_engine.sql?\n' + (e?.message || '')) }
  }

  return (
    <div>
      <Card title="Competitors" subtitle={`${competitors.length} registrados`}
        actions={<PrimaryBtn onClick={openNew}>+ Competitor</PrimaryBtn>}>
        {competitors.length === 0 ? (
          <EmptyState icon="🏢" title="Sin competidores" hint="Agrega el primer competidor del mercado." />
        ) : (
          <TableWrap>
            <thead><tr><Th>Nombre</Th><Th>Categoría</Th><Th align="right">Rating</Th><Th align="right">Reviews</Th><Th align="center">Precio</Th><Th>Debilidades</Th><Th align="right">Acciones</Th></tr></thead>
            <tbody>
              {competitors.map(c => (
                <Tr key={c.id}>
                  <Td bold>{c.name}{c.website && <a href={c.website} target="_blank" rel="noreferrer" className="ml-1 text-[10px] text-blue-500">↗</a>}</Td>
                  <Td>{c.category ? <Badge>{c.category}</Badge> : '—'}</Td>
                  <Td align="right"><Stars rating={c.rating} /></Td>
                  <Td align="right" mono color="#6b7280">{c.review_count || '—'}</Td>
                  <Td align="center" mono>{c.price_level || '—'}</Td>
                  <Td color="#6b7280">{c.weaknesses ? (c.weaknesses.length > 40 ? c.weaknesses.slice(0, 40) + '…' : c.weaknesses) : '—'}</Td>
                  <Td align="right">
                    <button onClick={() => openEdit(c)} className="mr-1 rounded px-2 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-50">Editar</button>
                    <button onClick={() => confirm('¿Eliminar?') && remove('competitors', c.id)} className="rounded px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50">✕</button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {modal && (
        <Modal title={editing ? 'Editar competidor' : 'Nuevo competidor'} onClose={() => setModal(false)}
          footer={<><GhostBtn onClick={() => setModal(false)}>Cancelar</GhostBtn><PrimaryBtn onClick={save}>{editing ? 'Guardar' : 'Agregar'}</PrimaryBtn></>}>
          <FormGrid>
            <Field label="Nombre" full><Input value={form.name} onChange={e => set('name', e.target.value)} /></Field>
            <Field label="Website"><Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" /></Field>
            <Field label="Categoría"><Input value={form.category} onChange={e => set('category', e.target.value)} /></Field>
            <Field label="Dirección" full><Input value={form.address} onChange={e => set('address', e.target.value)} /></Field>
            <Field label="Rating (0-5)"><Input type="number" step="0.1" value={form.rating} onChange={e => set('rating', e.target.value)} /></Field>
            <Field label="# Reviews"><Input type="number" value={form.review_count} onChange={e => set('review_count', e.target.value)} /></Field>
            <Field label="Nivel de precio">
              <Select value={form.price_level} onChange={e => set('price_level', e.target.value)}>
                {PRICE_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Fortalezas" full><Textarea value={form.strengths} onChange={e => set('strengths', e.target.value)} /></Field>
            <Field label="Debilidades" full><Textarea value={form.weaknesses} onChange={e => set('weaknesses', e.target.value)} /></Field>
            <Field label="Notas" full><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}
