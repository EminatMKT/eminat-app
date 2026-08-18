import { useState, useEffect } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { researchRepo, removeChannel } from '@/shared/data'
import { STAGE, COUNT_COLUMN } from '../constants'
import { EXPORT_HEADERS, validateLead, buildLeadPayload } from '../utils/fields'
import { LEAD_FILTERS } from '../utils/filters'
import { applyFilters, type FilterValues } from '@/shared/lib/filters'
import { useUserPreference } from '@/shared/lib/useUserPreference'
import type { ImportPlan } from '../utils/importPlan'
import { totalEmails, cadenceBreakdown } from '../utils/counters'
import { pendingSpecialty, type Specialty } from '../utils/specialty'
import { fetchStudyByNCT } from '../utils/clinicalTrials'
import { escapeHtml } from '@/shared/lib/html'
import type { Lead, Activity, Campaign, Stage } from '../types'

export type SpecialtyMatch = { id: string; nct: string; title: string; especialidad: Specialty }
export type SpecialtyScan = { found: SpecialtyMatch[]; missing: { id: string; nct: string }[]; total: number }

export function useResearchData() {
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  const [leads, setLeads] = useState<Lead[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  // Los filtros se recuerdan: Royner trabaja su tanda por rango de fechas y no tiene por qué
  // rearmarla cada vez que entra. El riesgo de "me faltan leads" lo cubre la barra, que muestra
  // los filtros activos, su conteo en la cabecera (visible aun con el panel recogido) y Limpiar.
  const [filterValues, setFilterValues] = useUserPreference<FilterValues>('research-lead-filters', {})

  useEffect(() => { loadData() }, [])

  // Realtime: el pool de leads es compartido → reflejar en vivo lo que suben/editan/borran
  // otros usuarios sin refrescar. Dedup por id absorbe el eco de las acciones propias.
  useEffect(() => {
    const ch = researchRepo.subscribeToLeads<Lead>({
      onInsert: row => setLeads(prev => prev.some(l => l.id === row.id) ? prev : [row, ...prev]),
      onUpdate: row => setLeads(prev => prev.map(l => l.id === row.id ? { ...l, ...row } : l)),
      onDelete: row => setLeads(prev => prev.filter(l => l.id !== row.id)),
    })
    return () => { removeChannel(ch) }
  }, [])

  async function loadData() {
    const [{ data: l }, { data: a }, { data: c }] = await Promise.all([
      researchRepo.listLeads(),
      researchRepo.listActivities(),
      researchRepo.listCampaigns(),
    ])
    setLeads(l || [])
    setActivities(a || [])
    setCampaigns(c || [])
    setLoading(false)
  }

  const filteredLeads = applyFilters(leads, LEAD_FILTERS, filterValues)
  const setFilterValue = (key: string, value: string) => setFilterValues(p => ({ ...p, [key]: value }))
  const clearFilters = () => setFilterValues({})

  const totalLeads = leads.length
  const activeLeads = leads.filter(l => l.stage === STAGE.NUEVO || l.stage === STAGE.CONTACTADO).length
  const nuevos = leads.filter(l => l.stage === STAGE.NUEVO).length
  const contactados = leads.filter(l => l.stage === STAGE.CONTACTADO).length
  const ganados = leads.filter(l => l.stage === STAGE.GANADO).length
  const sinRespuesta = leads.filter(l => l.stage === STAGE.SIN_RESPUESTA).length
  // "Cuántos han sido contactados, INDEPENDIENTEMENTE de cuántos correos se han enviado, cuántos
  // leads ya están en proceso, ya se envió al menos un correo" (Federico, 12/08/2026 min 12:49).
  // Ojo: NO es la etapa `Contactado` — un lead en `Sin respuesta` con 3 correos también fue
  // contactado. Ese solapamiento lo reconoció él mismo en la misma reunión.
  const contactadosConCorreo = leads.filter(l => (l.email_count ?? 0) >= 1).length
  // El esfuerzo real: 81 registros únicos esconden ~165-170 alcances (reunión 12/08/2026).
  const totalCorreos = totalEmails(leads)
  const cadencia = cadenceBreakdown(leads)
  // "Mes / fecha de registro" (card 4 del pedido): cuántos leads entraron en el mes en curso.
  // date_added es DATE (YYYY-MM-DD) → alcanza con comparar el prefijo del mes. El mes se toma
  // en hora LOCAL ('sv-SE' da YYYY-MM-DD): con toISOString, en UTC-4 el último día del mes a
  // partir de las 20:00 la card ya contaba el mes siguiente mientras el rótulo decía el actual.
  const mesActual = new Date().toLocaleDateString('sv-SE').slice(0, 7)
  const cargadosEsteMes = leads.filter(l => (l.date_added ?? '').startsWith(mesActual)).length

  // Fiel a la tabla: agrupa por el stage REAL de cada lead (migrado o no). Nada se oculta por
  // estado de migración; un valor legacy ('Awarded', etc.) aparece tal cual. null/'' → 'Sin etapa'.
  const stageData = Object.entries(leads.reduce((m: Record<string, number>, l) => {
    const s = (l.stage || '').trim() || 'Sin etapa'
    m[s] = (m[s] || 0) + 1
    return m
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  // Fiel a la tabla, igual que stageData: agrupa por el valor REAL de phase (canónico 'Phase 2',
  // combos, 'N/A' o legacy crudo '2'). El cómputo viejo (Number(phase)===1..4) no contaba los
  // valores canónicos que guarda la app ('Phase 2' → NaN). null/'' → 'Sin fase'.
  const phaseData = Object.entries(leads.reduce((m: Record<string, number>, l) => {
    const p = (l.phase ?? '').toString().trim() || 'Sin fase'
    m[p] = (m[p] || 0) + 1
    return m
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const sponsorData = Object.entries(leads.reduce((m: any, l) => { if (l.lead_sponsor) { m[l.lead_sponsor] = (m[l.lead_sponsor] || 0) + 1 } return m }, {}))
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value).slice(0, 8)

  const countryData: Record<string, number> = leads.reduce((m: any, l) => {
    const countries = (l.countries || '').split(',').map((c: string) => c.trim()).filter(Boolean)
    countries.forEach((c: string) => { m[c] = (m[c] || 0) + 1 })
    return m
  }, {})
  const countrySorted = Object.entries(countryData).sort((a, b) => b[1] - a[1])

  async function saveLead(data: any): Promise<boolean> {
    const invalid = validateLead(data)
    if (invalid) { mostrarMensaje('error', t(invalid)); return false }
    const payload = buildLeadPayload(data)
    if (data.id) {
      const { error } = await researchRepo.updateLead(data.id, payload)
      if (error) { mostrarMensaje('error', 'No se pudo guardar: ' + error.message); return false }
      setLeads(prev => prev.map(l => l.id === data.id ? { ...l, ...payload } : l))
    } else {
      const { data: inserted, error } = await researchRepo.insertLead(payload)
      if (error) { mostrarMensaje('error', 'No se pudo guardar: ' + error.message); return false }
      if (inserted) setLeads(prev => [inserted[0], ...prev])
    }
    mostrarMensaje('ok', data.id ? 'Lead actualizado' : 'Lead creado')
    return true
  }

  async function deleteLead(id: string) {
    await researchRepo.deleteLead(id)
    setLeads(prev => prev.filter(l => l.id !== id))
    mostrarMensaje('ok', 'Lead eliminado')
  }

  async function addActivity(leadId: string, act: { tipo: string; nota: string; fecha: string }) {
    const record = { lead_id: leadId, tipo: act.tipo, nota: act.nota, fecha: act.fecha }
    const { data } = await researchRepo.insertActivity(record)
    if (data) setActivities(prev => [data[0], ...prev])
    mostrarMensaje('ok', 'Actividad registrada')
  }

  async function updateStage(leadId: string, newStage: Stage) {
    await researchRepo.updateLeadStage(leadId, newStage)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l))
  }

  // Única vía de escritura manual del contador: la confirma el pop-up. Se guarda solo esta
  // columna (no el lead entero) para no arrastrar estado viejo de ningún form.
  async function setEmailCount(leadId: string, count: number) {
    const { error } = await researchRepo.updateLead(leadId, { [COUNT_COLUMN]: count })
    if (error) { mostrarMensaje('error', 'Error: ' + error.message); return false }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, email_count: count } : l))
    return true
  }

  // — Backfill de especialidad —
  // Consulta CT.gov por cada lead que tiene NCT# y no tiene especialidad, y devuelve QUÉ
  // derivaría, sin escribir nada. La escritura la hace applySpecialties después de que una
  // persona lo confirme en el modal: derivar es una inferencia, no un hecho, y se revisa antes
  // de guardarla sobre 81 filas de una.
  //
  // Va de a uno y no en paralelo a propósito: son ~80 requests a un servicio público y gratuito
  // que no es nuestro, y el modal muestra el avance, así que la espera es visible y tolerable.
  async function scanSpecialties(onProgress?: (done: number, total: number) => void): Promise<SpecialtyScan> {
    const pending = pendingSpecialty(leads)
    const found: SpecialtyMatch[] = []
    const missing: { id: string; nct: string }[] = []
    for (let i = 0; i < pending.length; i++) {
      const l = pending[i]
      const nct = (l.nct_number || '').trim()
      const { study } = await fetchStudyByNCT(nct)
      const especialidad = study?.especialidad as Specialty | undefined
      if (especialidad) found.push({ id: l.id, nct, title: l.official_title || '', especialidad })
      else missing.push({ id: l.id, nct })
      onProgress?.(i + 1, pending.length)
    }
    return { found, missing, total: pending.length }
  }

  // Escribe lo confirmado. Si una fila falla, corta y conserva lo ya aplicado (mismo criterio
  // que confirmImport): mejor un backfill parcial y visible que un rollback silencioso.
  async function applySpecialties(found: SpecialtyMatch[]): Promise<boolean> {
    const applied: SpecialtyMatch[] = []
    for (const m of found) {
      const { error } = await researchRepo.updateLead(m.id, { especialidad: m.especialidad })
      if (error) { mostrarMensaje('error', 'Error: ' + error.message); break }
      applied.push(m)
    }
    if (applied.length) {
      const byId = new Map(applied.map(m => [m.id, m.especialidad]))
      setLeads(prev => prev.map(l => byId.has(l.id) ? { ...l, especialidad: byId.get(l.id)! } : l))
    }
    return applied.length === found.length
  }

  async function confirmImport(plan: ImportPlan) {
    let inserted: Lead[] = []
    if (plan.toInsert.length) {
      const { data, error } = await researchRepo.insertLeads(plan.toInsert)
      if (error) { mostrarMensaje('error', 'Error: ' + error.message); return false }
      inserted = data || []
    }
    // Aplicar updates uno a uno; si uno falla, cortamos pero conservamos lo ya aplicado.
    const applied: { id: string; values: Record<string, any> }[] = []
    let failed: string | null = null
    for (const u of plan.toUpdate) {
      const { error } = await researchRepo.updateLead(u.id, u.values)
      if (error) { failed = error.message; break }
      applied.push(u)
    }
    // Reflejar en el estado TODO lo que sí se guardó (inserts + updates OK), aun si un update falla:
    // de lo contrario un reintento del mismo archivo re-insertaría los NCT# ya creados (duplicados).
    const patch = new Map(applied.map(u => [u.id, u.values]))
    setLeads(prev => [...inserted, ...prev.map(l => (patch.has(l.id) ? { ...l, ...patch.get(l.id) } : l))])
    if (failed) { mostrarMensaje('error', 'Error: ' + failed); return false }
    mostrarMensaje('ok', t('research.import.done', { ins: inserted.length, upd: plan.toUpdate.length, skip: plan.skipped }))
    return true
  }

  async function duplicateCampaign(c: Campaign) {
    const { data } = await researchRepo.insertCampaign({ nombre: `${c.nombre} (copia)`, asunto: c.asunto, contenido: c.contenido, tipo: 'Email', estado: 'Borrador', total_enviados: 0 })
    if (data) { setCampaigns(prev => [data[0], ...prev]); mostrarMensaje('ok', 'Campaña duplicada') }
  }

  async function deleteCampaign(id: string) {
    await researchRepo.deleteCampaign(id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
    mostrarMensaje('ok', 'Campaña eliminada')
  }

  function handleExport() {
    const csv = [EXPORT_HEADERS.join(','), ...filteredLeads.map(l => EXPORT_HEADERS.map(h => `"${(l[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'research_leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    const w = window.open('', '_blank', 'width=1000,height=700')
    if (!w) return
    const rows = filteredLeads.map((l, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(l.nct_number)}</td><td>${escapeHtml(l.official_title)}</td><td>${escapeHtml(l.phase)}</td><td>${escapeHtml(l.lead_sponsor)}</td><td>${escapeHtml(l.stage)}</td><td>${escapeHtml(l.countries)}</td></tr>`).join('')
    w.document.write(`<!DOCTYPE html><html><head><title>Research Leads</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,sans-serif;padding:30px 40px;font-size:12px}h1{font-size:18px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px;text-align:left;font-size:10px;border-bottom:2px solid #ddd;text-transform:uppercase}td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}@media print{.no-print{display:none!important}}</style></head><body><h1>Eminat Research Group — Leads Report</h1><table><thead><tr><th>#</th><th>NCT#</th><th>Title</th><th>Phase</th><th>Sponsor</th><th>Stage</th><th>Countries</th></tr></thead><tbody>${rows}</tbody></table><div class="no-print" style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;cursor:pointer">Print</button></div></body></html>`)
    w.document.close()
  }

  return {
    leads, activities, campaigns, loading, setCampaigns,
    filterValues, setFilterValue, clearFilters,
    filteredLeads,
    totalLeads, activeLeads, nuevos, contactados, contactadosConCorreo, ganados, sinRespuesta, totalCorreos, cadencia, cargadosEsteMes,
    stageData, phaseData, sponsorData, countryData, countrySorted,
    saveLead, deleteLead, addActivity, updateStage, setEmailCount, confirmImport, handleExport, handlePrint,
    scanSpecialties, applySpecialties,
    duplicateCampaign, deleteCampaign,
  }
}
