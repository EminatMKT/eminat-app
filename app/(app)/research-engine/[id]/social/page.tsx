'use client'
import { useState } from 'react'
import { useProject } from '@/app/components/research-engine/ProjectProvider'
import { SOCIAL_PLATFORMS, type SocialProfile } from '@/lib/researchEngine'
import {
  Card, KPI, TableWrap, Th, Td, Tr, EmptyState, Badge,
  Modal, Field, Input, Textarea, Select, FormGrid, PrimaryBtn, GhostBtn, ACCENT,
} from '@/app/components/research-engine/ui'

const BLANK = { competitor_id: '', platform: 'Instagram', handle: '', url: '', followers: '', engagement_rate: '', notes: '' }
const PLATFORM_COLOR: Record<string, string> = { Instagram: '#E1306C', Facebook: '#1877F2', TikTok: '#000000', YouTube: '#FF0000', LinkedIn: '#0A66C2', Google: '#4285F4', X: '#111111', Yelp: '#D32323' }

export default function SocialPage() {
  const { social, competitors, add, update, remove } = useProject()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<SocialProfile | null>(null)
  const [form, setForm] = useState<any>(BLANK)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  const compName = (id?: string | null) => competitors.find(c => c.id === id)?.name || '—'

  const totalFollowers = social.reduce((a, b) => a + (Number(b.followers) || 0), 0)
  const avgEng = social.filter(s => s.engagement_rate).length
    ? social.reduce((a, b) => a + (Number(b.engagement_rate) || 0), 0) / social.filter(s => s.engagement_rate).length : 0

  function openNew() { setEditing(null); setForm(BLANK); setModal(true) }
  function openEdit(s: SocialProfile) { setEditing(s); setForm({ ...BLANK, ...s, competitor_id: s.competitor_id || '' }); setModal(true) }

  async function save() {
    const row = { ...form, followers: Number(form.followers) || null, engagement_rate: Number(form.engagement_rate) || null, competitor_id: form.competitor_id || null }
    try {
      if (editing) await update('social', editing.id, row)
      else await add('social', row)
      setModal(false)
    } catch (e: any) { alert('Error al guardar. ¿Corriste research_engine.sql?\n' + (e?.message || '')) }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <KPI label="Perfiles" value={social.length} accent={ACCENT.pink} />
        <KPI label="Seguidores totales" value={totalFollowers.toLocaleString('en-US')} accent={ACCENT.purple} />
        <KPI label="Engagement promedio" value={avgEng ? avgEng.toFixed(1) + '%' : '—'} accent={ACCENT.blue} />
      </div>

      <Card title="Social Media Insights" subtitle={`${social.length} perfiles`}
        actions={<PrimaryBtn onClick={openNew}>+ Social Profile</PrimaryBtn>}>
        {social.length === 0 ? (
          <EmptyState icon="📱" title="Sin perfiles sociales" hint="Agrega perfiles de la competencia (Instagram, Facebook, TikTok…)." />
        ) : (
          <TableWrap>
            <thead><tr><Th>Plataforma</Th><Th>Handle</Th><Th>Competidor</Th><Th align="right">Seguidores</Th><Th align="right">Engagement</Th><Th align="right">Acciones</Th></tr></thead>
            <tbody>
              {social.map(s => (
                <Tr key={s.id}>
                  <Td><Badge color={PLATFORM_COLOR[s.platform || ''] || ACCENT.purple}>{s.platform}</Badge></Td>
                  <Td bold>{s.handle || '—'}{s.url && <a href={s.url} target="_blank" rel="noreferrer" className="ml-1 text-[10px] text-blue-500">↗</a>}</Td>
                  <Td color="#6b7280">{compName(s.competitor_id)}</Td>
                  <Td align="right" mono>{s.followers != null ? Number(s.followers).toLocaleString('en-US') : '—'}</Td>
                  <Td align="right" mono color={ACCENT.blue}>{s.engagement_rate != null ? Number(s.engagement_rate) + '%' : '—'}</Td>
                  <Td align="right">
                    <button onClick={() => openEdit(s)} className="mr-1 rounded px-2 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-50">Editar</button>
                    <button onClick={() => confirm('¿Eliminar?') && remove('social', s.id)} className="rounded px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50">✕</button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {modal && (
        <Modal title={editing ? 'Editar perfil' : 'Nuevo perfil social'} onClose={() => setModal(false)}
          footer={<><GhostBtn onClick={() => setModal(false)}>Cancelar</GhostBtn><PrimaryBtn onClick={save}>{editing ? 'Guardar' : 'Agregar'}</PrimaryBtn></>}>
          <FormGrid>
            <Field label="Plataforma">
              <Select value={form.platform} onChange={e => set('platform', e.target.value)}>
                {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Competidor">
              <Select value={form.competitor_id} onChange={e => set('competitor_id', e.target.value)}>
                <option value="">— Sin asignar —</option>
                {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Handle"><Input value={form.handle} onChange={e => set('handle', e.target.value)} placeholder="@usuario" /></Field>
            <Field label="URL"><Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://" /></Field>
            <Field label="Seguidores"><Input type="number" value={form.followers} onChange={e => set('followers', e.target.value)} /></Field>
            <Field label="Engagement %"><Input type="number" step="0.1" value={form.engagement_rate} onChange={e => set('engagement_rate', e.target.value)} /></Field>
            <Field label="Notas" full><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
          </FormGrid>
        </Modal>
      )}
    </div>
  )
}
