import { useState, useEffect } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { PIPELINE_COLS, EXPORT_HEADERS } from '../constants'
import type { Lead, Activity, Campaign } from '../types'

export function useResearchData() {
  const { mostrarMensaje } = useApp()
  const [leads, setLeads] = useState<Lead[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ stage: '', phase: '', status: '', country: '', sponsor: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: l }, { data: a }, { data: c }] = await Promise.all([
      supabase.from('research_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('research_activities').select('*').order('created_at', { ascending: false }),
      supabase.from('research_campaigns').select('*').order('created_at', { ascending: false }),
    ])
    setLeads(l || [])
    setActivities(a || [])
    setCampaigns(c || [])
    setLoading(false)
  }

  const filteredLeads = leads.filter(l => {
    if (filters.stage && l.stage !== filters.stage) return false
    if (filters.phase && String(l.phase) !== filters.phase) return false
    if (filters.status && l.status !== filters.status) return false
    if (filters.country && !(l.countries || '').includes(filters.country)) return false
    if (filters.sponsor && l.lead_sponsor !== filters.sponsor) return false
    return true
  })

  const uniqueVals = (field: string) => Array.from(new Set(leads.map(l => l[field]).filter(Boolean)))

  const totalLeads = leads.length
  const activeLeads = leads.filter(l => !['Cerrado', 'Awarded'].includes(l.stage || '')).length
  const awarded = leads.filter(l => l.stage === 'Awarded').length
  const inNeg = leads.filter(l => l.stage === 'Negociación').length

  const stageData = PIPELINE_COLS.map(s => ({ name: s, value: leads.filter(l => l.stage === s).length })).filter(d => d.value > 0)
  const phaseData = [1, 2, 3, 4].map(p => ({ name: `Phase ${p}`, value: leads.filter(l => Number(l.phase) === p).length }))
  const sponsorData = Object.entries(leads.reduce((m: any, l) => { if (l.lead_sponsor) { m[l.lead_sponsor] = (m[l.lead_sponsor] || 0) + 1 } return m }, {}))
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value).slice(0, 8)

  const countryData: Record<string, number> = leads.reduce((m: any, l) => {
    const countries = (l.countries || '').split(',').map((c: string) => c.trim()).filter(Boolean)
    countries.forEach((c: string) => { m[c] = (m[c] || 0) + 1 })
    return m
  }, {})
  const countrySorted = Object.entries(countryData).sort((a, b) => b[1] - a[1])

  async function saveLead(data: any) {
    if (data.id) {
      await supabase.from('research_leads').update(data).eq('id', data.id)
      setLeads(prev => prev.map(l => l.id === data.id ? { ...l, ...data } : l))
    } else {
      const { data: inserted } = await supabase.from('research_leads').insert([data]).select()
      if (inserted) setLeads(prev => [inserted[0], ...prev])
    }
    mostrarMensaje('ok', data.id ? 'Lead actualizado' : 'Lead creado')
  }

  async function deleteLead(id: string) {
    await supabase.from('research_leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
    mostrarMensaje('ok', 'Lead eliminado')
  }

  async function addActivity(leadId: string, act: { tipo: string; nota: string; fecha: string }) {
    const record = { lead_id: leadId, tipo: act.tipo, nota: act.nota, fecha: act.fecha }
    const { data } = await supabase.from('research_activities').insert([record]).select()
    if (data) setActivities(prev => [data[0], ...prev])
    mostrarMensaje('ok', 'Actividad registrada')
  }

  async function updateStage(leadId: string, newStage: string) {
    await supabase.from('research_leads').update({ stage: newStage }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l))
  }

  async function confirmImport(records: any[]) {
    const { error } = await supabase.from('research_leads').insert(records)
    if (error) { mostrarMensaje('error', 'Error: ' + error.message); return false }
    mostrarMensaje('ok', `${records.length} leads importados`)
    loadData()
    return true
  }

  async function duplicateCampaign(c: Campaign) {
    const { data } = await supabase.from('research_campaigns').insert([{ nombre: `${c.nombre} (copia)`, asunto: c.asunto, contenido: c.contenido, tipo: 'Email', estado: 'Borrador', total_enviados: 0 }]).select()
    if (data) { setCampaigns(prev => [data[0], ...prev]); mostrarMensaje('ok', 'Campaña duplicada') }
  }

  async function deleteCampaign(id: string) {
    await supabase.from('research_campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
    mostrarMensaje('ok', 'Campaña eliminada')
  }

  function handleExport() {
    const csv = [EXPORT_HEADERS.join(','), ...filteredLeads.map(l => EXPORT_HEADERS.map(h => `"${(l[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'research_leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    const w = window.open('', '_blank', 'width=1000,height=700')
    if (!w) return
    const rows = filteredLeads.map((l, i) => `<tr><td>${i + 1}</td><td>${l.nct || ''}</td><td>${l.official_title || ''}</td><td>${l.phase || ''}</td><td>${l.lead_sponsor || ''}</td><td>${l.stage || ''}</td><td>${l.countries || ''}</td></tr>`).join('')
    w.document.write(`<!DOCTYPE html><html><head><title>Research Leads</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,sans-serif;padding:30px 40px;font-size:12px}h1{font-size:18px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px;text-align:left;font-size:10px;border-bottom:2px solid #ddd;text-transform:uppercase}td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}@media print{.no-print{display:none!important}}</style></head><body><h1>Eminat Research Group — Leads Report</h1><table><thead><tr><th>#</th><th>NCT#</th><th>Title</th><th>Phase</th><th>Sponsor</th><th>Stage</th><th>Countries</th></tr></thead><tbody>${rows}</tbody></table><div class="no-print" style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;cursor:pointer">Print</button></div></body></html>`)
    w.document.close()
  }

  return {
    leads, activities, campaigns, loading, setCampaigns,
    filters, setFilters,
    filteredLeads, uniqueVals,
    totalLeads, activeLeads, awarded, inNeg,
    stageData, phaseData, sponsorData, countryData, countrySorted,
    saveLead, deleteLead, addActivity, updateStage, confirmImport, handleExport, handlePrint,
    duplicateCampaign, deleteCampaign,
  }
}
