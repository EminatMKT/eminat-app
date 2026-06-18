'use client'
import { useState } from 'react'
import { useProject } from '@/app/components/research-engine/ProjectProvider'
import { SOURCE_TYPES, type Source } from '@/lib/researchEngine'
import {
  Card, TableWrap, Th, Td, Tr, EmptyState, Badge,
  Modal, Field, Input, Textarea, Select, FormGrid, PrimaryBtn, GhostBtn,
} from '@/app/components/research-engine/ui'

const BLANK = { title: '', url: '', type: 'website', notes: '' }

export default function SourcesPage() {
  const { sources, add, update, remove } = useProject()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Source | null>(null)
  const [form, setForm] = useState<any>(BLANK)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  function openNew() { setEditing(null); setForm(BLANK); setModal(true) }
  function openEdit(s: Source) { setEditing(s); setForm({ ...BLANK, ...s }); setModal(true) }

  async function save() {
    if (!form.title.trim()) { alert('Pon un título.'); return }
    try {
      if (editing) await update('sources', editing.id, form)
      else await add('sources', form)
      setModal(false)
    } catch (e: any) { alert('Error al guardar. ¿Corriste research_engine.sql?\n' + (e?.message || '')) }
  }

  return (
    <div>
      <Card title="Sources" subtitle={`${sources.length} fuentes citadas`}
        actions={<PrimaryBtn onClick={openNew}>+ Source</PrimaryBtn>}>
        {sources.length === 0 ? (
          <EmptyState icon="🔗" title="Sin fuentes" hint="Documenta de dónde sale cada dato (webs, reportes, reviews…)." />
        ) : (
          <TableWrap>
            <thead><tr><Th>Título</Th><Th>Tipo</Th><Th>URL</Th><Th>Notas</Th><Th align="right">Acciones</Th></tr></thead>
            <tbody>
              {sources.map(s => (
                <Tr key={s.id}>
                  <Td bold>{s.title || '—'}</Td>
                  <Td><Badge>{s.type}</Badge></Td>
                  <Td>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-500">{s.url.length > 40 ? s.url.slice(0, 40) + '…' : s.url}</a> : '—'}</Td>
                  <Td color="#6b7280">{s.notes || '—'}</Td>
                  <Td align="right">
                    <button onClick={() => openEdit(s)} className="mr-1 rounded px-2 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-50">Editar</button>
                    <button onClick={() => confirm('¿Eliminar?') && remove('sources', s.id)} className="rounded px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50">✕</button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {modal && (
        <Modal title={editing ? 'Editar fuente' : 'Nueva fuente'} onClose={() => setModal(false)}
          footer={<><GhostBtn onClick={() => setModal(false)}>Cancelar</GhostBtn><PrimaryBtn onClick={save}>{editing ? 'Guardar' : 'Agregar'}</PrimaryBtn></>}>
          <FormGrid>
            <Field label="Título" full><Input value={form.title} onChange={e => set('title', e.target.value)} /></Field>
            <Field label="Tipo">
              <Select value={form.type} onChange={e => set('type', e.target.value)}>
                {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="URL"><Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://" /></Field>
            <Field label="Notas" full><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}
