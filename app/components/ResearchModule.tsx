'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const PIPELINE_COLS = ['Identificado', 'Calificado', 'Outreach', 'Contacto', 'Discovery/Feasibility', 'Docs', 'Negociación', 'Awarded', 'Cerrado']
const PIPELINE_COLORS: Record<string, string> = { Identificado: '#9494B3', Calificado: '#60A5FA', Outreach: '#A78BFA', Contacto: '#F472B6', 'Discovery/Feasibility': '#FBB040', Docs: '#FB923C', 'Negociación': '#F87171', Awarded: '#34D399', Cerrado: '#7C6FF7' }
const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C', '#22D3EE', '#9494B3']

const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸', 'USA': '🇺🇸', 'US': '🇺🇸', 'Spain': '🇪🇸', 'Germany': '🇩🇪', 'France': '🇫🇷', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
  'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵', 'China': '🇨🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'India': '🇮🇳',
  'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
  'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'South Korea': '🇰🇷', 'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿', 'Greece': '🇬🇷', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Taiwan': '🇹🇼',
}

interface Props {
  dark: boolean
  tab: string
  setTab: (t: string) => void
  mostrarMensaje: (tipo: 'ok' | 'error', texto: string) => void
}

export default function ResearchModule({ dark, tab, setTab, mostrarMensaje }: Props) {
  const bg = dark ? '#0A0A0F' : '#F5F5F7'
  const s1 = dark ? '#12121A' : '#FFFFFF'
  const s2 = dark ? '#1A1A25' : '#F0F0F3'
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#F0F0F5' : '#111'
  const t2 = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const t3 = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
  const accent = '#7C6FF7'
  const inputStyle: any = { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${border}`, background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }

  const [leads, setLeads] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Lead management
  const [modalLead, setModalLead] = useState<any>(null)
  const [modalNewLead, setModalNewLead] = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [newLead, setNewLead] = useState<any>({})
  const [editingLead, setEditingLead] = useState<any>(null)
  const [modalActivity, setModalActivity] = useState<any>(null)
  const [newActivity, setNewActivity] = useState({ tipo: 'email', nota: '', fecha: new Date().toISOString().split('T')[0] })

  // Filters
  const [filters, setFilters] = useState({ stage: '', phase: '', status: '', country: '', sponsor: '' })

  // Newsletter
  const [nlStep, setNlStep] = useState(0)
  const [nlSelected, setNlSelected] = useState<string[]>([])
  const [nlSearch, setNlSearch] = useState('')
  const [nlCampaign, setNlCampaign] = useState({ subject: '', content: '', type: 'Email' })

  // SMS
  const [smsSelected, setSmsSelected] = useState<string[]>([])
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSearch, setSmsSearch] = useState('')

  // Mailing
  const [mailCampaign, setMailCampaign] = useState({ nombre: '', asunto: '', contenido: '', estado: 'Borrador' })
  const [modalMailCampaign, setModalMailCampaign] = useState(false)

  // Pipeline drag
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

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

  // Filtered leads
  const filteredLeads = leads.filter(l => {
    if (filters.stage && l.stage !== filters.stage) return false
    if (filters.phase && String(l.phase) !== filters.phase) return false
    if (filters.status && l.status !== filters.status) return false
    if (filters.country && !(l.countries || '').includes(filters.country)) return false
    if (filters.sponsor && l.lead_sponsor !== filters.sponsor) return false
    return true
  })

  const uniqueVals = (field: string) => Array.from(new Set(leads.map(l => l[field]).filter(Boolean)))

  // Dashboard stats
  const totalLeads = leads.length
  const activeLeads = leads.filter(l => !['Cerrado', 'Awarded'].includes(l.stage)).length
  const awarded = leads.filter(l => l.stage === 'Awarded').length
  const inNeg = leads.filter(l => l.stage === 'Negociación').length

  // Charts data
  const stageData = PIPELINE_COLS.map(s => ({ name: s, value: leads.filter(l => l.stage === s).length })).filter(d => d.value > 0)
  const phaseData = [1, 2, 3, 4].map(p => ({ name: `Phase ${p}`, value: leads.filter(l => Number(l.phase) === p).length }))
  const sponsorData = Object.entries(leads.reduce((m: any, l) => { if (l.lead_sponsor) { m[l.lead_sponsor] = (m[l.lead_sponsor] || 0) + 1 } return m }, {}))
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value).slice(0, 8)

  // Country counts
  const countryData = leads.reduce((m: any, l) => {
    const countries = (l.countries || '').split(',').map((c: string) => c.trim()).filter(Boolean)
    countries.forEach((c: string) => { m[c] = (m[c] || 0) + 1 })
    return m
  }, {})
  const countrySorted = Object.entries(countryData).sort((a: any, b: any) => b[1] - a[1])

  // Handlers
  async function saveLead(data: any) {
    if (data.id) {
      await supabase.from('research_leads').update(data).eq('id', data.id)
      setLeads(prev => prev.map(l => l.id === data.id ? { ...l, ...data } : l))
    } else {
      const { data: inserted } = await supabase.from('research_leads').insert([data]).select()
      if (inserted) setLeads(prev => [inserted[0], ...prev])
    }
    mostrarMensaje('ok', data.id ? 'Lead actualizado' : 'Lead creado')
    setModalNewLead(false)
    setEditingLead(null)
    setNewLead({})
  }

  async function deleteLead(id: string) {
    await supabase.from('research_leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
    setModalLead(null)
    mostrarMensaje('ok', 'Lead eliminado')
  }

  async function saveActivity() {
    const record = { lead_id: modalActivity.id, tipo: newActivity.tipo, nota: newActivity.nota, fecha: newActivity.fecha }
    const { data } = await supabase.from('research_activities').insert([record]).select()
    if (data) setActivities(prev => [data[0], ...prev])
    setModalActivity(null)
    setNewActivity({ tipo: 'email', nota: '', fecha: new Date().toISOString().split('T')[0] })
    mostrarMensaje('ok', 'Actividad registrada')
  }

  async function updateStage(leadId: string, newStage: string) {
    await supabase.from('research_leads').update({ stage: newStage }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l))
  }

  function handleExport() {
    const headers = ['date_added', 'conditions', 'nct', 'official_title', 'phase', 'study_type', 'status', 'countries', 'lead_sponsor', 'contact_name', 'email', 'phone', 'second_contact', 'second_email', 'stage', 'next_followup', 'notes']
    const csv = [headers.join(','), ...filteredLeads.map(l => headers.map(h => `"${(l[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
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

  async function handleImportFile(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter((l: string) => l.trim())
    if (lines.length < 2) { mostrarMensaje('error', 'Archivo vacío'); return }
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase().replace(/ /g, '_').replace(/#/g, ''))
    const records = lines.slice(1).map((line: string) => {
      const vals = line.split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''))
      const obj: any = {}
      headers.forEach((h: string, i: number) => { obj[h] = vals[i] || '' })
      return obj
    })
    setImportPreview(records)
  }

  async function confirmImport() {
    if (!importPreview) return
    const { error } = await supabase.from('research_leads').insert(importPreview)
    if (error) { mostrarMensaje('error', 'Error: ' + error.message); return }
    mostrarMensaje('ok', `${importPreview.length} leads importados`)
    setImportPreview(null)
    setModalImport(false)
    loadData()
  }

  const selectStyle = { ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12 }
  const leadFields = ['date_added', 'conditions', 'nct', 'official_title', 'phase', 'study_type', 'status', 'countries', 'lead_sponsor', 'contact_name', 'email', 'phone', 'second_contact', 'second_email', 'stage', 'next_followup', 'notes', 'note']
  const fieldLabels: Record<string, string> = { date_added: 'Date Added', conditions: 'Conditions', nct: 'NCT#', official_title: 'Official Title', phase: 'Phase', study_type: 'Study Type', status: 'Status', countries: 'Countries', lead_sponsor: 'Lead Sponsor', contact_name: 'Contact Name', email: 'Email', phone: 'Phone', second_contact: '2nd Contact', second_email: '2nd Email', stage: 'Stage', next_followup: 'Next Follow-up', notes: 'Notes', note: 'NOTE' }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: t3 }}>Cargando Research...</div>

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#60A5FA20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔬</div>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: t1 }}>Eminat Research Group</div>
            <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>Clinical Research Operations</div>
          </div>
        </div>
        {tab === 'leads' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => { setNewLead({}); setModalNewLead(true) }} style={{ padding: '6px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Nuevo Lead</button>
            <button onClick={() => setModalImport(true)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📥 Importar</button>
            <button onClick={handleExport} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📤 Exportar</button>
            <button onClick={handlePrint} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🖨 PDF</button>
          </div>
        )}
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {tab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total Leads', value: totalLeads, color: '#60A5FA' },
              { label: 'Leads Activos', value: activeLeads, color: '#34D399' },
              { label: 'Awarded', value: awarded, color: '#FBB040' },
              { label: 'En Negociación', value: inNeg, color: '#F87171' },
            ].map(k => (
              <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Country map */}
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads por País</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {countrySorted.map(([country, count]: any) => (
                <div key={country} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: s2, border: `1px solid ${border}` }}>
                  <span style={{ fontSize: 16 }}>{COUNTRY_FLAGS[country] || '🌍'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{country}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: accent, background: `${accent}20`, padding: '1px 7px', borderRadius: 10 }}>{count}</span>
                </div>
              ))}
              {countrySorted.length === 0 && <span style={{ color: t3, fontSize: 12 }}>Sin datos de países</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Pipeline por Stage</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={stageData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {stageData.map((d, i) => <Cell key={i} fill={PIPELINE_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {stageData.map(d => <span key={d.name} style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: PIPELINE_COLORS[d.name] || accent }} /><span style={{ color: t3 }}>{d.name} ({d.value})</span></span>)}
              </div>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Leads por Phase</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={phaseData}><XAxis dataKey="name" tick={{ fontSize: 10, fill: t3 }} /><YAxis tick={{ fontSize: 10, fill: t3 }} /><Tooltip contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {phaseData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Bar></BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Top Sponsors</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sponsorData} layout="vertical"><XAxis type="number" tick={{ fontSize: 9, fill: t3 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: t3 }} width={120} /><Tooltip contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {sponsorData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar></BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, fontSize: 12, fontWeight: 600, color: t1 }}>Últimos leads agregados</div>
              {leads.slice(0, 5).map(l => (
                <div key={l.id} style={{ padding: '8px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, color: accent, fontFamily: 'DM Mono', width: 80, flexShrink: 0 }}>{l.nct || '—'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.official_title || l.conditions || '—'}</div>
                    <div style={{ fontSize: 9, color: t3 }}>{l.lead_sponsor} · {l.stage}</div>
                  </div>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${PIPELINE_COLORS[l.stage] || t3}20`, color: PIPELINE_COLORS[l.stage] || t3, fontWeight: 600, whiteSpace: 'nowrap' }}>{l.stage}</span>
                </div>
              ))}
              {leads.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: t3, fontSize: 12 }}>Sin leads</div>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEADS ═══ */}
      {tab === 'leads' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filters.stage} onChange={e => setFilters(p => ({ ...p, stage: e.target.value }))} style={selectStyle}>
              <option value="">Todos los Stages</option>
              {PIPELINE_COLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.phase} onChange={e => setFilters(p => ({ ...p, phase: e.target.value }))} style={selectStyle}>
              <option value="">Todas las Phases</option>
              {[1, 2, 3, 4].map(p => <option key={p} value={String(p)}>Phase {p}</option>)}
            </select>
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} style={selectStyle}>
              <option value="">Todos los Status</option>
              {uniqueVals('status').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.country} onChange={e => setFilters(p => ({ ...p, country: e.target.value }))} style={selectStyle}>
              <option value="">Todos los Países</option>
              {Object.keys(countryData).sort().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.sponsor} onChange={e => setFilters(p => ({ ...p, sponsor: e.target.value }))} style={selectStyle}>
              <option value="">Todos los Sponsors</option>
              {uniqueVals('lead_sponsor').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setFilters({ stage: '', phase: '', status: '', country: '', sponsor: '' })} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer' }}>✕ Limpiar</button>
            <span style={{ fontSize: 11, color: t3, marginLeft: 'auto' }}>{filteredLeads.length} resultados</span>
          </div>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1200 }}>
                <thead><tr style={{ background: s2 }}>
                  {['Date', 'Conditions', 'NCT#', 'Title', 'Phase', 'Status', 'Countries', 'Sponsor', 'Contact', 'Email', 'Stage', 'Follow-up', 'Acciones'].map(h =>
                    <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 9, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400, whiteSpace: 'nowrap' }}>{h}</th>
                  )}
                </tr></thead>
                <tbody>{filteredLeads.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '7px 10px', color: t3, fontSize: 10, whiteSpace: 'nowrap' }}>{l.date_added || '—'}</td>
                    <td style={{ padding: '7px 10px', color: t2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.conditions || '—'}</td>
                    <td style={{ padding: '7px 10px', color: accent, fontFamily: 'DM Mono', fontSize: 10 }}>{l.nct || '—'}</td>
                    <td style={{ padding: '7px 10px', color: t1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{l.official_title || '—'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${accent}20`, color: accent, fontWeight: 600 }}>{l.phase || '—'}</span></td>
                    <td style={{ padding: '7px 10px', color: t2, fontSize: 10 }}>{l.status || '—'}</td>
                    <td style={{ padding: '7px 10px', color: t2, fontSize: 10, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.countries || '—'}</td>
                    <td style={{ padding: '7px 10px', color: t2, fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.lead_sponsor || '—'}</td>
                    <td style={{ padding: '7px 10px', color: t2, fontSize: 10 }}>{l.contact_name || '—'}</td>
                    <td style={{ padding: '7px 10px', color: '#60A5FA', fontSize: 10 }}>{l.email || '—'}</td>
                    <td style={{ padding: '7px 10px' }}><span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${PIPELINE_COLORS[l.stage] || t3}20`, color: PIPELINE_COLORS[l.stage] || t3, fontWeight: 600, whiteSpace: 'nowrap' }}>{l.stage || '—'}</span></td>
                    <td style={{ padding: '7px 10px', color: t3, fontSize: 10, whiteSpace: 'nowrap' }}>{l.next_followup || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setModalLead(l)} style={{ padding: '3px 6px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 10, cursor: 'pointer' }} title="Ver">👁</button>
                        <button onClick={() => { setNewLead(l); setEditingLead(l); setModalNewLead(true) }} style={{ padding: '3px 6px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 10, cursor: 'pointer' }} title="Editar">✏️</button>
                        <button onClick={() => setModalActivity(l)} style={{ padding: '3px 6px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 10, cursor: 'pointer' }} title="Actividad">📞</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {filteredLeads.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin leads encontrados</div>}
          </div>
        </div>
      )}

      {/* ═══ NEWSLETTER ═══ */}
      {tab === 'newsletter' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['Contactos', 'Campaña', 'Vista Previa', 'Resultados'].map((step, i) => (
              <div key={step} onClick={() => setNlStep(i)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: nlStep === i ? `${accent}20` : s1, border: `1px solid ${nlStep === i ? accent : border}`, textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{['👥', '⚙️', '👁', '📊'][i]}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: nlStep === i ? accent : t2 }}>Paso {i + 1}</div>
                <div style={{ fontSize: 10, color: t3 }}>{step}</div>
              </div>
            ))}
          </div>
          {nlStep === 0 && (
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <input value={nlSearch} onChange={e => setNlSearch(e.target.value)} placeholder="Buscar por nombre, email, teléfono..." style={{ ...inputStyle, marginBottom: 12 }} />
              <div style={{ fontSize: 11, color: t3, marginBottom: 8 }}>{nlSelected.length} contactos seleccionados</div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {leads.filter(l => !nlSearch || (l.contact_name || '').toLowerCase().includes(nlSearch.toLowerCase()) || (l.email || '').toLowerCase().includes(nlSearch.toLowerCase()) || (l.phone || '').includes(nlSearch)).map(l => (
                  <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
                    <input type="checkbox" checked={nlSelected.includes(l.id)} onChange={() => setNlSelected(prev => prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id])} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{l.contact_name || '—'}</div>
                      <div style={{ fontSize: 10, color: t3 }}>{l.email} · {l.phone || 'Sin tel.'}</div>
                    </div>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${PIPELINE_COLORS[l.stage] || t3}20`, color: PIPELINE_COLORS[l.stage] || t3 }}>{l.stage}</span>
                  </label>
                ))}
              </div>
              <button onClick={() => setNlStep(1)} disabled={nlSelected.length === 0} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, background: nlSelected.length > 0 ? accent : t3, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: nlSelected.length > 0 ? 'pointer' : 'default' }}>Siguiente →</button>
            </div>
          )}
          {nlStep === 1 && (
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Asunto</label><input value={nlCampaign.subject} onChange={e => setNlCampaign(p => ({ ...p, subject: e.target.value }))} style={inputStyle} placeholder="Asunto de la campaña" /></div>
              <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo</label>
                <select value={nlCampaign.type} onChange={e => setNlCampaign(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  <option value="Email">Email</option><option value="Reunión">Reunión</option><option value="Llamada">Llamada</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Contenido</label><textarea value={nlCampaign.content} onChange={e => setNlCampaign(p => ({ ...p, content: e.target.value }))} style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }} placeholder="Escribe el contenido..." /></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setNlStep(0)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>← Atrás</button>
                <button onClick={() => setNlStep(2)} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Siguiente →</button>
              </div>
            </div>
          )}
          {nlStep === 2 && (
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t1, marginBottom: 16 }}>Vista Previa</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div><span style={{ fontSize: 10, color: t3 }}>Tipo:</span> <span style={{ fontSize: 12, color: t1, fontWeight: 600 }}>{nlCampaign.type}</span></div>
                <div><span style={{ fontSize: 10, color: t3 }}>Destinatarios:</span> <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{nlSelected.length}</span></div>
              </div>
              <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Asunto</div><div style={{ fontSize: 13, color: t1, fontWeight: 600 }}>{nlCampaign.subject || '(sin asunto)'}</div></div>
              <div style={{ marginBottom: 14, padding: 14, background: s2, borderRadius: 10 }}><div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Contenido</div><div style={{ fontSize: 12, color: t2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{nlCampaign.content || '(sin contenido)'}</div></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setNlStep(1)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>← Atrás</button>
                <button onClick={async () => {
                  const { data: camp } = await supabase.from('research_campaigns').insert([{ nombre: nlCampaign.subject, asunto: nlCampaign.subject, contenido: nlCampaign.content, tipo: nlCampaign.type, estado: 'Enviado', total_enviados: nlSelected.length }]).select()
                  if (camp?.[0]) {
                    const recs = nlSelected.map(lid => ({ campaign_id: camp[0].id, lead_id: lid, status: 'sent' }))
                    await supabase.from('research_campaign_recipients').insert(recs)
                    setCampaigns(prev => [camp[0], ...prev])
                  }
                  mostrarMensaje('ok', `Campaña enviada a ${nlSelected.length} contactos`)
                  setNlStep(3)
                }} style={{ padding: '10px 24px', borderRadius: 10, background: '#34D399', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Enviar campaña ✓</button>
              </div>
            </div>
          )}
          {nlStep === 3 && (
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 30, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: '#34D399', marginBottom: 8 }}>Campaña enviada</div>
              <div style={{ fontSize: 13, color: t3, marginBottom: 20 }}>{nlSelected.length} contactos alcanzados · {nlCampaign.type}</div>
              <button onClick={() => { setNlStep(0); setNlSelected([]); setNlCampaign({ subject: '', content: '', type: 'Email' }) }} style={{ padding: '10px 24px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Nueva campaña</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ SMS ═══ */}
      {tab === 'sms' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>Seleccionar contactos</div>
            <input value={smsSearch} onChange={e => setSmsSearch(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ fontSize: 10, color: t3, marginBottom: 6 }}>{smsSelected.length} seleccionados</div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {leads.filter(l => l.phone && (!smsSearch || (l.contact_name || '').toLowerCase().includes(smsSearch.toLowerCase()))).map(l => (
                <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
                  <input type="checkbox" checked={smsSelected.includes(l.id)} onChange={() => setSmsSelected(prev => prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id])} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: t1 }}>{l.contact_name}</div>
                    <div style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono' }}>{l.phone}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>Mensaje SMS</div>
              <textarea value={smsMessage} onChange={e => { if (e.target.value.length <= 160) setSmsMessage(e.target.value) }} placeholder="Escribe tu mensaje..." style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: smsMessage.length > 140 ? '#F87171' : t3 }}>{smsMessage.length}/160 caracteres</span>
                <button onClick={async () => {
                  const { data: camp } = await supabase.from('research_campaigns').insert([{ nombre: 'SMS — ' + new Date().toLocaleDateString(), tipo: 'SMS', contenido: smsMessage, estado: 'Enviado', total_enviados: smsSelected.length }]).select()
                  if (camp?.[0]) {
                    const recs = smsSelected.map(lid => ({ campaign_id: camp[0].id, lead_id: lid, status: 'sent' }))
                    await supabase.from('research_campaign_recipients').insert(recs)
                    setCampaigns(prev => [camp[0], ...prev])
                  }
                  mostrarMensaje('ok', `SMS enviado a ${smsSelected.length} contactos`)
                  setSmsMessage('')
                  setSmsSelected([])
                }} disabled={smsSelected.length === 0 || !smsMessage} style={{ padding: '8px 20px', borderRadius: 8, background: smsSelected.length > 0 && smsMessage ? '#34D399' : t3, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: smsSelected.length > 0 && smsMessage ? 'pointer' : 'default' }}>Enviar SMS</button>
              </div>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>Historial SMS</div>
              {campaigns.filter(c => c.tipo === 'SMS').slice(0, 5).map(c => (
                <div key={c.id} style={{ padding: '8px 0', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <div><div style={{ fontSize: 11, color: t1 }}>{c.nombre}</div><div style={{ fontSize: 9, color: t3 }}>{c.total_enviados} enviados</div></div>
                  <span style={{ fontSize: 9, color: '#34D399' }}>{c.estado}</span>
                </div>
              ))}
              {campaigns.filter(c => c.tipo === 'SMS').length === 0 && <div style={{ color: t3, fontSize: 11, textAlign: 'center', padding: 20 }}>Sin historial</div>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAILING ═══ */}
      {tab === 'mailing' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Campañas de Mailing</span>
            <button onClick={() => { setMailCampaign({ nombre: '', asunto: '', contenido: '', estado: 'Borrador' }); setModalMailCampaign(true) }} style={{ padding: '7px 16px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Nueva campaña</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Enviados', value: campaigns.filter(c => c.tipo === 'Email' && c.estado === 'Enviado').length, color: '#34D399' },
              { label: 'Borradores', value: campaigns.filter(c => c.estado === 'Borrador').length, color: '#FBB040' },
              { label: 'Total campañas', value: campaigns.length, color: accent },
            ].map(k => (
              <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: s2 }}>
                {['Nombre', 'Tipo', 'Estado', 'Enviados', 'Fecha'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
              </tr></thead>
              <tbody>{campaigns.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: '9px 14px', color: t1, fontWeight: 500 }}>{c.nombre}</td>
                  <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${accent}20`, color: accent }}>{c.tipo}</span></td>
                  <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: c.estado === 'Enviado' ? '#34D39920' : '#FBB04020', color: c.estado === 'Enviado' ? '#34D399' : '#FBB040', fontWeight: 600 }}>{c.estado}</span></td>
                  <td style={{ padding: '9px 14px', color: t3, fontFamily: 'DM Mono' }}>{c.total_enviados || 0}</td>
                  <td style={{ padding: '9px 14px', color: t3, fontSize: 10 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
            {campaigns.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin campañas</div>}
          </div>
        </div>
      )}

      {/* ═══ PIPELINE ═══ */}
      {tab === 'pipeline' && (
        <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
          <div style={{ display: 'flex', gap: 10, minWidth: PIPELINE_COLS.length * 180 }}>
            {PIPELINE_COLS.map(col => {
              const colLeads = leads.filter(l => l.stage === col)
              return (
                <div key={col} onDragOver={e => { e.preventDefault(); setDragOver(col) }} onDrop={() => { if (dragId) { updateStage(dragId, col); setDragId(null); setDragOver(null) } }} onDragLeave={() => setDragOver(null)}
                  style={{ flex: 1, minWidth: 170, borderRadius: 14, background: dragOver === col ? `${PIPELINE_COLORS[col]}08` : s2, border: dragOver === col ? `2px dashed ${PIPELINE_COLORS[col]}` : `1px solid ${border}`, transition: 'all .15s' }}>
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${PIPELINE_COLORS[col]}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: t1 }}>{col}</span>
                    <span style={{ fontSize: 10, color: t3, background: s1, padding: '1px 7px', borderRadius: 10, fontFamily: 'DM Mono' }}>{colLeads.length}</span>
                  </div>
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
                    {colLeads.map(l => (
                      <div key={l.id} draggable onDragStart={() => setDragId(l.id)} onDragEnd={() => { setDragId(null); setDragOver(null) }}
                        onClick={() => setModalLead(l)}
                        style={{ background: s1, borderRadius: 10, padding: '10px 11px', border: `1px solid ${dragId === l.id ? accent : border}`, cursor: 'grab', opacity: dragId === l.id ? .4 : 1, transition: 'all .15s' }}>
                        <div style={{ fontSize: 9, color: accent, fontFamily: 'DM Mono', marginBottom: 4 }}>{l.nct || '—'}</div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: t1, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.official_title || l.conditions || '—'}</div>
                        <div style={{ fontSize: 9, color: t3 }}>{l.lead_sponsor}</div>
                        {l.date_added && <div style={{ fontSize: 8, color: t3, marginTop: 4 }}>📅 {l.date_added}</div>}
                      </div>
                    ))}
                    {colLeads.length === 0 && <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: 16, textAlign: 'center', color: t3, fontSize: 10 }}>Arrastra aquí</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ OPORTUNIDADES ═══ */}
      {tab === 'oportunidades' && (() => {
        const opps = leads.filter(l => ['Awarded', 'Negociación'].includes(l.stage))
        const totalPipeline = opps.length
        const totalAwarded = opps.filter(l => l.stage === 'Awarded').length
        const totalEstimado = opps.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0)
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total en Pipeline', value: totalPipeline, color: '#60A5FA' },
                { label: 'Total Awarded', value: totalAwarded, color: '#34D399' },
                { label: 'Valor Estimado', value: `$${totalEstimado.toLocaleString()}`, color: '#FBB040' },
              ].map(k => (
                <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: s2 }}>
                  {['NCT#', 'Título', 'Sponsor', 'Stage', 'Valor Estimado', 'Países', 'Fecha'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
                </tr></thead>
                <tbody>{opps.map(l => (
                  <tr key={l.id} onClick={() => setModalLead(l)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', color: accent, fontFamily: 'DM Mono', fontSize: 11 }}>{l.nct || '—'}</td>
                    <td style={{ padding: '9px 12px', color: t1, fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.official_title || '—'}</td>
                    <td style={{ padding: '9px 12px', color: t2 }}>{l.lead_sponsor || '—'}</td>
                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${PIPELINE_COLORS[l.stage] || t3}20`, color: PIPELINE_COLORS[l.stage] || t3, fontWeight: 600 }}>{l.stage}</span></td>
                    <td style={{ padding: '9px 12px', color: '#FBB040', fontFamily: 'DM Mono', fontWeight: 600 }}>{l.valor_estimado ? `$${Number(l.valor_estimado).toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '9px 12px', color: t3, fontSize: 11 }}>{l.countries || '—'}</td>
                    <td style={{ padding: '9px 12px', color: t3, fontSize: 10 }}>{l.date_added || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
              {opps.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin oportunidades activas</div>}
            </div>
          </div>
        )
      })()}

      {/* ═══ MODALS ═══ */}

      {/* Lead Detail Modal */}
      {modalLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalLead(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Detalle del Lead</div>
                <div style={{ fontSize: 11, color: accent, fontFamily: 'DM Mono' }}>{modalLead.nct || '—'}</div>
              </div>
              <button onClick={() => setModalLead(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {leadFields.map(f => (
                <div key={f} style={{ ...(f === 'official_title' || f === 'notes' || f === 'note' ? { gridColumn: '1 / -1' } : {}) }}>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 3 }}>{fieldLabels[f]}</div>
                  <div style={{ fontSize: 12, color: t1, fontWeight: 500, padding: '6px 10px', background: s2, borderRadius: 8, minHeight: 30, wordBreak: 'break-word' }}>{modalLead[f] || '—'}</div>
                </div>
              ))}
            </div>
            {/* Activities for this lead */}
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 8 }}>Actividades</div>
              {activities.filter(a => a.lead_id === modalLead.id).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: 14 }}>{a.tipo === 'email' ? '📧' : a.tipo === 'llamada' ? '📞' : '🤝'}</span>
                  <div><div style={{ fontSize: 11, color: t1 }}>{a.nota}</div><div style={{ fontSize: 9, color: t3 }}>{a.fecha}</div></div>
                </div>
              ))}
              {activities.filter(a => a.lead_id === modalLead.id).length === 0 && <div style={{ fontSize: 11, color: t3 }}>Sin actividades registradas</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setNewLead(modalLead); setEditingLead(modalLead); setModalLead(null); setModalNewLead(true) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${accent}`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✏️ Editar</button>
              <button onClick={() => { setModalLead(null); setModalActivity(modalLead) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#60A5FA', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📞 Actividad</button>
              <button onClick={() => { if (confirm('¿Eliminar lead?')) deleteLead(modalLead.id) }} style={{ padding: '10px 16px', borderRadius: 10, background: '#F8717120', color: '#F87171', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Lead Modal */}
      {modalNewLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setModalNewLead(false); setEditingLead(null) }}>
          <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{editingLead ? 'Editar Lead' : 'Nuevo Lead'}</div>
              <button onClick={() => { setModalNewLead(false); setEditingLead(null) }} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {leadFields.map(f => (
                <div key={f} style={{ ...(f === 'official_title' || f === 'notes' || f === 'note' ? { gridColumn: '1 / -1' } : {}) }}>
                  <label style={{ fontSize: 10, color: t3, display: 'block', marginBottom: 4 }}>{fieldLabels[f]}</label>
                  {f === 'stage' ? (
                    <select value={newLead[f] || ''} onChange={e => setNewLead((p: any) => ({ ...p, [f]: e.target.value }))} style={inputStyle}>
                      <option value="">Seleccionar</option>
                      {PIPELINE_COLS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : f === 'notes' || f === 'note' ? (
                    <textarea value={newLead[f] || ''} onChange={e => setNewLead((p: any) => ({ ...p, [f]: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
                  ) : (
                    <input value={newLead[f] || ''} onChange={e => setNewLead((p: any) => ({ ...p, [f]: e.target.value }))} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setModalNewLead(false); setEditingLead(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => saveLead(newLead)} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{editingLead ? 'Guardar cambios' : 'Crear lead'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {modalActivity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalActivity(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 440, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Agregar actividad</div>
              <button onClick={() => setModalActivity(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 11, color: t3, marginBottom: 14 }}>Lead: <strong style={{ color: accent }}>{modalActivity.contact_name || modalActivity.nct}</strong></div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={newActivity.tipo} onChange={e => setNewActivity(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
                <option value="email">📧 Email</option><option value="llamada">📞 Llamada</option><option value="reunion">🤝 Reunión</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Fecha</label>
              <input type="date" value={newActivity.fecha} onChange={e => setNewActivity(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Nota</label>
              <textarea value={newActivity.nota} onChange={e => setNewActivity(p => ({ ...p, nota: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Descripción de la actividad..." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalActivity(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveActivity} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {modalImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setModalImport(false); setImportPreview(null) }}>
          <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Importar Excel/CSV</div>
              <button onClick={() => { setModalImport(false); setImportPreview(null) }} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {!importPreview ? (
              <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 12, color: t3, marginBottom: 12 }}>Selecciona un archivo CSV o Excel</div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} style={{ fontSize: 12 }} />
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#34D399', marginBottom: 12 }}>✓ {importPreview.length} registros detectados</div>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 10, marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead><tr style={{ background: s2 }}>
                      {Object.keys(importPreview[0] || {}).slice(0, 6).map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: t3, borderBottom: `1px solid ${border}` }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{importPreview.slice(0, 5).map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${border}` }}>
                        {Object.values(r).slice(0, 6).map((v: any, j) => <td key={j} style={{ padding: '5px 8px', color: t2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</td>)}
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setImportPreview(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={confirmImport} style={{ flex: 2, padding: '10px', borderRadius: 10, background: '#34D399', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirmar importación ({importPreview.length})</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mailing Campaign Modal */}
      {modalMailCampaign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalMailCampaign(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Nueva campaña</div>
              <button onClick={() => setModalMailCampaign(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Nombre</label><input value={mailCampaign.nombre} onChange={e => setMailCampaign(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Asunto</label><input value={mailCampaign.asunto} onChange={e => setMailCampaign(p => ({ ...p, asunto: e.target.value }))} style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 4 }}>Contenido</label><textarea value={mailCampaign.contenido} onChange={e => setMailCampaign(p => ({ ...p, contenido: e.target.value }))} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalMailCampaign(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                const { data } = await supabase.from('research_campaigns').insert([{ nombre: mailCampaign.nombre, asunto: mailCampaign.asunto, contenido: mailCampaign.contenido, tipo: 'Email', estado: mailCampaign.estado, total_enviados: 0 }]).select()
                if (data) setCampaigns(prev => [data[0], ...prev])
                setModalMailCampaign(false)
                mostrarMensaje('ok', 'Campaña creada')
              }} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Crear campaña</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
