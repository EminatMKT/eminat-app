'use client'
import { useState, useEffect } from 'react'
import { useApp, MESES } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PageTransition, StaggerGrid, StaggerItem, AnimatedNumber } from '@/lib/motion'

export default function CobranzasPage() {
  const { s1, s2, border, t1, t2, t3, accent, inputStyle, canCobranzas, mostrarMensaje } = useApp()

  const [cobTab, setCobTab] = useState('ventas')
  const [cobMes, setCobMes] = useState(MESES[new Date().getMonth()])
  const [cobVentas, setCobVentas] = useState<any[]>([])
  const [cobCuentas, setCobCuentas] = useState<any[]>([])
  const [cobDepositos, setCobDepositos] = useState<any[]>([])
  const [cobFiltros, setCobFiltros] = useState({ periodo: '', laboratorio: '', estudio: '', banco: '', contratante: '', tipo: '' })
  const [cobModalImport, setCobModalImport] = useState(false)
  const [cobModalAdd, setCobModalAdd] = useState(false)
  const [cobNewRecord, setCobNewRecord] = useState<any>({})

  useEffect(() => {
    if (!canCobranzas) return
    const load = async () => {
      const [v, c, d] = await Promise.all([
        supabase.from('cobranzas_ventas').select('*').order('created_at', { ascending: false }),
        supabase.from('cobranzas_cuentas').select('*').order('created_at', { ascending: false }),
        supabase.from('cobranzas_depositos').select('*').order('created_at', { ascending: false }),
      ])
      setCobVentas(v.data || [])
      setCobCuentas(c.data || [])
      setCobDepositos(d.data || [])
    }
    load()
  }, [canCobranzas])

  if (!canCobranzas) {
    return (
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Sin permisos</div>
          <div style={{ fontSize: 13, color: t3, textAlign: 'center', maxWidth: 300 }}>No tienes acceso al modulo de Cobranzas. Contacta al administrador.</div>
        </div>
      </AppShell>
    )
  }

  const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C']
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

  // Ventas filtering
  const ventasFilt = cobVentas.filter(v => {
    if (cobFiltros.periodo && v.periodo !== cobFiltros.periodo) return false
    if (cobFiltros.laboratorio && v.laboratorio !== cobFiltros.laboratorio) return false
    if (cobFiltros.estudio && v.estudio !== cobFiltros.estudio) return false
    return true
  })
  const totalVentas = ventasFilt.reduce((s, v) => s + (Number(v.monto) || 0), 0)
  const ventas1Q = ventasFilt.filter(v => v.periodo === '1Q').reduce((s, v) => s + (Number(v.monto) || 0), 0)
  const ventas2Q = ventasFilt.filter(v => v.periodo === '2Q').reduce((s, v) => s + (Number(v.monto) || 0), 0)
  const ventasLabs = Object.entries(ventasFilt.reduce((m: any, v) => { m[v.laboratorio || 'N/A'] = (m[v.laboratorio || 'N/A'] || 0) + (Number(v.monto) || 0); return m }, {})).map(([name, value]) => ({ name, value }))
  const ventasEstudios = Object.entries(ventasFilt.reduce((m: any, v) => { m[v.estudio || 'N/A'] = (m[v.estudio || 'N/A'] || 0) + (Number(v.monto) || 0); return m }, {})).map(([name, value]) => ({ name, value }))
  const labsUniq = Array.from(new Set(cobVentas.map(v => v.laboratorio).filter(Boolean)))
  const estudiosUniqV = Array.from(new Set(cobVentas.map(v => v.estudio).filter(Boolean)))

  // Cuentas filtering
  const cuentasFilt = cobCuentas.filter(c => {
    if (cobFiltros.laboratorio && c.laboratorio !== cobFiltros.laboratorio) return false
    if (cobFiltros.estudio && c.estudio !== cobFiltros.estudio) return false
    return true
  })
  const totalVencido = cuentasFilt.reduce((s, c) => s + (Number(c.vencido) || 0), 0)
  const totalPorVencer = cuentasFilt.reduce((s, c) => s + (Number(c.por_vencer) || 0), 0)
  const totalAdeudado = totalVencido + totalPorVencer
  const cuentasDonut = [{ name: 'Vencido', value: totalVencido }, { name: 'Por Vencer', value: totalPorVencer }]
  const cuentasEstudios = Object.entries(cuentasFilt.reduce((m: any, c) => { const k = c.estudio || 'N/A'; if (!m[k]) m[k] = { vencido: 0, por_vencer: 0 }; m[k].vencido += Number(c.vencido) || 0; m[k].por_vencer += Number(c.por_vencer) || 0; return m }, {})).map(([name, v]: any) => ({ name, vencido: v.vencido, por_vencer: v.por_vencer }))
  const labsUniqC = Array.from(new Set(cobCuentas.map(c => c.laboratorio).filter(Boolean)))
  const estudiosUniqC = Array.from(new Set(cobCuentas.map(c => c.estudio).filter(Boolean)))

  // Depositos filtering
  const depsFilt = cobDepositos.filter(d => {
    if (cobFiltros.periodo && d.periodo !== cobFiltros.periodo) return false
    if (cobFiltros.banco && d.banco !== cobFiltros.banco) return false
    if (cobFiltros.contratante && d.contratante !== cobFiltros.contratante) return false
    return true
  })
  const totalDep = depsFilt.reduce((s, d) => s + (Number(d.depositado) || 0), 0)
  const dep1Q = depsFilt.filter(d => d.periodo === '1Q').reduce((s, d) => s + (Number(d.depositado) || 0), 0)
  const dep2Q = depsFilt.filter(d => d.periodo === '2Q').reduce((s, d) => s + (Number(d.depositado) || 0), 0)
  const depBancos = Object.entries(depsFilt.reduce((m: any, d) => { m[d.banco || 'N/A'] = (m[d.banco || 'N/A'] || 0) + (Number(d.depositado) || 0); return m }, {})).map(([name, value]) => ({ name, value }))
  const depContratantes = Object.entries(depsFilt.reduce((m: any, d) => { m[d.contratante || 'N/A'] = (m[d.contratante || 'N/A'] || 0) + (Number(d.depositado) || 0); return m }, {})).map(([name, value]) => ({ name, value }))
  const bancosUniq = Array.from(new Set(cobDepositos.map(d => d.banco).filter(Boolean)))
  const contratantesUniq = Array.from(new Set(cobDepositos.map(d => d.contratante).filter(Boolean)))

  const clearFilters = () => setCobFiltros({ periodo: '', laboratorio: '', estudio: '', banco: '', contratante: '', tipo: '' })

  const handleExport = () => {
    let rows: any[] = []
    let headers: string[] = []
    if (cobTab === 'ventas') { headers = ['Mes','Periodo','Laboratorio','Estudio','Monto']; rows = ventasFilt.map(v => [v.mes, v.periodo, v.laboratorio, v.estudio, v.monto]) }
    else if (cobTab === 'cuentas') { headers = ['Laboratorio','Estudio','Tipo','Vencido','Por Vencer','Total']; rows = cuentasFilt.map(c => [c.laboratorio, c.estudio, c.tipo, c.vencido, c.por_vencer, (Number(c.vencido)||0)+(Number(c.por_vencer)||0)]) }
    else { headers = ['Periodo','Contratante','Banco','Identificacion','Estudio','Depositado']; rows = depsFilt.map(d => [d.periodo, d.contratante, d.banco, d.identificacion, d.estudio, d.depositado]) }
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `cobranzas_${cobTab}_${cobMes}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter((l: string) => l.trim())
    if (lines.length < 2) { mostrarMensaje('error', 'Archivo vacio'); return }
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase().replace(/ /g, '_'))
    const records = lines.slice(1).map((line: string) => {
      const vals = line.split(',').map((v: string) => v.trim())
      const obj: any = {}
      headers.forEach((h: string, i: number) => { obj[h] = vals[i] || '' })
      return obj
    })
    const table = cobTab === 'ventas' ? 'cobranzas_ventas' : cobTab === 'cuentas' ? 'cobranzas_cuentas' : 'cobranzas_depositos'
    const { error } = await supabase.from(table).insert(records)
    if (error) { mostrarMensaje('error', 'Error al importar: ' + error.message); return }
    mostrarMensaje('ok', `${records.length} registros importados`)
    setCobModalImport(false)
    // Refresh
    const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false })
    if (cobTab === 'ventas') setCobVentas(data || [])
    else if (cobTab === 'cuentas') setCobCuentas(data || [])
    else setCobDepositos(data || [])
  }

  const handleAddRecord = async () => {
    const table = cobTab === 'ventas' ? 'cobranzas_ventas' : cobTab === 'cuentas' ? 'cobranzas_cuentas' : 'cobranzas_depositos'
    const { error } = await supabase.from(table).insert([cobNewRecord])
    if (error) { mostrarMensaje('error', 'Error: ' + error.message); return }
    mostrarMensaje('ok', 'Registro agregado')
    setCobModalAdd(false)
    setCobNewRecord({})
    const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false })
    if (cobTab === 'ventas') setCobVentas(data || [])
    else if (cobTab === 'cuentas') setCobCuentas(data || [])
    else setCobDepositos(data || [])
  }

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    const title = cobTab === 'ventas' ? 'Ventas del Mes' : cobTab === 'cuentas' ? 'Cuentas por Cobrar' : 'Depositos en Banco'
    let tableHtml = ''
    if (cobTab === 'ventas') {
      tableHtml = `<table><thead><tr>${['Mes','Periodo','Laboratorio','Estudio','Monto'].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${ventasFilt.map(v => `<tr><td>${v.mes||''}</td><td>${v.periodo||''}</td><td>${v.laboratorio||''}</td><td>${v.estudio||''}</td><td>${fmt(Number(v.monto)||0)}</td></tr>`).join('')}</tbody></table>`
    } else if (cobTab === 'cuentas') {
      tableHtml = `<table><thead><tr>${['Laboratorio','Estudio','Tipo','Vencido','Por Vencer','Total'].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${cuentasFilt.map(c => `<tr><td>${c.laboratorio||''}</td><td>${c.estudio||''}</td><td>${c.tipo||''}</td><td>${fmt(Number(c.vencido)||0)}</td><td>${fmt(Number(c.por_vencer)||0)}</td><td>${fmt((Number(c.vencido)||0)+(Number(c.por_vencer)||0))}</td></tr>`).join('')}</tbody></table>`
    } else {
      tableHtml = `<table><thead><tr>${['Periodo','Contratante','Banco','ID','Estudio','Depositado'].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${depsFilt.map(d => `<tr><td>${d.periodo||''}</td><td>${d.contratante||''}</td><td>${d.banco||''}</td><td>${d.identificacion||''}</td><td>${d.estudio||''}</td><td>${fmt(Number(d.depositado)||0)}</td></tr>`).join('')}</tbody></table>`
    }
    w.document.write(`<!DOCTYPE html><html><head><title>Cobranzas — ${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,Arial,sans-serif;padding:40px 50px;font-size:12px;color:#111}h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f5f5f5;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #ddd}td{padding:8px 10px;border-bottom:1px solid #eee}@media print{.no-print{display:none!important}}</style></head><body><h1>EMINAT LLC — Dashboard de Cobranzas</h1><h2>${title} · ${cobMes} 2026</h2>${tableHtml}<div class="no-print" style="text-align:center;margin-top:30px"><button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;font-size:13px;cursor:pointer">Imprimir</button></div></body></html>`)
    w.document.close()
  }

  const selectStyle = { ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12 }
  const addFields = cobTab === 'ventas' ? ['mes','periodo','laboratorio','estudio','monto'] : cobTab === 'cuentas' ? ['laboratorio','estudio','tipo','vencido','por_vencer'] : ['periodo','contratante','banco','identificacion','estudio','depositado']

  return (
    <AppShell>
      <PageTransition>
      <div>
        {/* Header + controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💳</div>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: t1 }}>Dashboard de Cobranzas</div>
              <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>EMINAT LLC · Research Operations</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select value={cobMes} onChange={e => setCobMes(e.target.value)} style={selectStyle}>
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => setCobModalImport(true)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📥 Importar CSV</button>
            <button onClick={handleExport} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>📤 Exportar CSV</button>
            <button onClick={handlePrint} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🖨 Imprimir PDF</button>
            <button onClick={() => { setCobNewRecord({}); setCobModalAdd(true) }} style={{ padding: '6px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Agregar</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
          {[
            { key: 'ventas', label: '💰 Ventas del Mes' },
            { key: 'cuentas', label: '📋 Cuentas por Cobrar' },
            { key: 'depositos', label: '🏦 Depositos en Banco' },
          ].map(tab => (
            <button key={tab.key} onClick={() => { setCobTab(tab.key); clearFilters() }}
              style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: cobTab === tab.key ? t1 : t3, borderBottom: cobTab === tab.key ? `2px solid ${accent}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
              {tab.label}
              {tab.key === 'depositos' && <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 4, background: `${t3}30`, color: t3, fontFamily: 'DM Mono' }}>SOON</span>}
            </button>
          ))}
        </div>

        {/* TAB: VENTAS */}
        {cobTab === 'ventas' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={cobFiltros.periodo} onChange={e => setCobFiltros(p => ({ ...p, periodo: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Periodos</option>
                <option value="1Q">1Q</option><option value="2Q">2Q</option>
              </select>
              <select value={cobFiltros.laboratorio} onChange={e => setCobFiltros(p => ({ ...p, laboratorio: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Laboratorios</option>
                {labsUniq.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={cobFiltros.estudio} onChange={e => setCobFiltros(p => ({ ...p, estudio: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Estudios</option>
                {estudiosUniqV.map(es => <option key={es} value={es}>{es}</option>)}
              </select>
              <button onClick={clearFilters} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer' }}>✕ Limpiar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total Ventas', value: fmt(totalVentas), color: '#34D399' },
                { label: 'Ventas 1Q', value: fmt(ventas1Q), color: '#60A5FA' },
                { label: 'Ventas 2Q', value: fmt(ventas2Q), color: '#A78BFA' },
                { label: 'Registros', value: ventasFilt.length, color: '#FB923C' },
              ].map(k => (
                <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Ventas por Laboratorio</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={ventasLabs} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {ventasLabs.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {ventasLabs.map((l, i) => <span key={l.name} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length] }} /><span style={{ color: t3 }}>{l.name}</span></span>)}
                </div>
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Ventas por Estudio</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ventasEstudios} layout="vertical"><XAxis type="number" tick={{ fontSize: 9, fill: t3 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: t3 }} width={100} /><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {ventasEstudios.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: s2 }}>
                  {['Mes','Periodo','Laboratorio','Estudio','Monto'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
                </tr></thead>
                <tbody>{ventasFilt.map((v, i) => (
                  <tr key={v.id || i} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '8px 12px', color: t2 }}>{v.mes}</td>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: v.periodo === '1Q' ? '#60A5FA20' : '#A78BFA20', color: v.periodo === '1Q' ? '#60A5FA' : '#A78BFA', fontWeight: 600 }}>{v.periodo}</span></td>
                    <td style={{ padding: '8px 12px', color: t2 }}>{v.laboratorio}</td>
                    <td style={{ padding: '8px 12px', color: t2 }}>{v.estudio}</td>
                    <td style={{ padding: '8px 12px', color: '#34D399', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(Number(v.monto) || 0)}</td>
                  </tr>
                ))}</tbody>
              </table>
              {ventasFilt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin registros de ventas</div>}
            </div>
          </div>
        )}

        {/* TAB: CUENTAS POR COBRAR */}
        {cobTab === 'cuentas' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={cobFiltros.laboratorio} onChange={e => setCobFiltros(p => ({ ...p, laboratorio: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Laboratorios</option>
                {labsUniqC.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={cobFiltros.estudio} onChange={e => setCobFiltros(p => ({ ...p, estudio: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Estudios</option>
                {estudiosUniqC.map(es => <option key={es} value={es}>{es}</option>)}
              </select>
              <button onClick={clearFilters} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer' }}>✕ Limpiar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total Vencido', value: fmt(totalVencido), color: '#F87171' },
                { label: 'Total por Vencer', value: fmt(totalPorVencer), color: '#FBB040' },
                { label: 'Total Adeudado', value: fmt(totalAdeudado), color: '#60A5FA' },
                { label: 'Registros', value: cuentasFilt.length, color: '#9494B3' },
              ].map(k => (
                <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Vencido vs Por Vencer</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={cuentasDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    <Cell fill="#F87171" /><Cell fill="#FBB040" />
                  </Pie><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                  {[{ label: 'Vencido', color: '#F87171' }, { label: 'Por Vencer', color: '#FBB040' }].map(l => <span key={l.label} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} /><span style={{ color: t3 }}>{l.label}</span></span>)}
                </div>
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Deuda por Estudio</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cuentasEstudios}><XAxis dataKey="name" tick={{ fontSize: 9, fill: t3 }} /><YAxis tick={{ fontSize: 9, fill: t3 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} /><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="vencido" fill="#F87171" radius={[4, 4, 0, 0]} name="Vencido" /><Bar dataKey="por_vencer" fill="#FBB040" radius={[4, 4, 0, 0]} name="Por Vencer" /></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: s2 }}>
                  {['Laboratorio','Estudio','Tipo','Vencido','Por Vencer','Total Adeudado'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
                </tr></thead>
                <tbody>{cuentasFilt.map((c, i) => (
                  <tr key={c.id || i} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '8px 12px', color: t2 }}>{c.laboratorio}</td>
                    <td style={{ padding: '8px 12px', color: t2 }}>{c.estudio}</td>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${t3}20`, color: t2 }}>{c.tipo}</span></td>
                    <td style={{ padding: '8px 12px', color: '#F87171', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(Number(c.vencido) || 0)}</td>
                    <td style={{ padding: '8px 12px', color: '#FBB040', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(Number(c.por_vencer) || 0)}</td>
                    <td style={{ padding: '8px 12px', color: '#60A5FA', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt((Number(c.vencido)||0) + (Number(c.por_vencer)||0))}</td>
                  </tr>
                ))}</tbody>
              </table>
              {cuentasFilt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin cuentas por cobrar</div>}
            </div>
          </div>
        )}

        {/* TAB: DEPOSITOS */}
        {cobTab === 'depositos' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={cobFiltros.periodo} onChange={e => setCobFiltros(p => ({ ...p, periodo: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Periodos</option>
                <option value="1Q">1Q</option><option value="2Q">2Q</option>
              </select>
              <select value={cobFiltros.banco} onChange={e => setCobFiltros(p => ({ ...p, banco: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Bancos</option>
                {bancosUniq.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={cobFiltros.contratante} onChange={e => setCobFiltros(p => ({ ...p, contratante: e.target.value }))} style={selectStyle}>
                <option value="">Todos los Contratantes</option>
                {contratantesUniq.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={clearFilters} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer' }}>✕ Limpiar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total Depositado', value: fmt(totalDep), color: '#34D399' },
                { label: 'Depositos 1Q', value: fmt(dep1Q), color: '#22D3EE' },
                { label: 'Depositos 2Q', value: fmt(dep2Q), color: '#A78BFA' },
                { label: 'Registros', value: depsFilt.length, color: '#9494B3' },
              ].map(k => (
                <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'DM Mono', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Depositos por Banco</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={depBancos} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {depBancos.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {depBancos.map((b, i) => <span key={b.name} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length] }} /><span style={{ color: t3 }}>{b.name}</span></span>)}
                </div>
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Depositos por Contratante</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={depContratantes} layout="vertical"><XAxis type="number" tick={{ fontSize: 9, fill: t3 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} /><YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: t3 }} width={110} /><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: s1, border: `1px solid ${border}`, borderRadius: 8, fontSize: 11 }} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {depContratantes.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar></BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: s2 }}>
                  {['Periodo','Contratante','Banco','Identificacion','Estudio','Depositado'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
                </tr></thead>
                <tbody>{depsFilt.map((d, i) => (
                  <tr key={d.id || i} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: d.periodo === '1Q' ? '#22D3EE20' : '#A78BFA20', color: d.periodo === '1Q' ? '#22D3EE' : '#A78BFA', fontWeight: 600 }}>{d.periodo}</span></td>
                    <td style={{ padding: '8px 12px', color: t2 }}>{d.contratante}</td>
                    <td style={{ padding: '8px 12px', color: t2 }}>{d.banco}</td>
                    <td style={{ padding: '8px 12px', color: t3, fontFamily: 'DM Mono', fontSize: 11 }}>{d.identificacion}</td>
                    <td style={{ padding: '8px 12px', color: t2 }}>{d.estudio}</td>
                    <td style={{ padding: '8px 12px', color: '#34D399', fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(Number(d.depositado) || 0)}</td>
                  </tr>
                ))}</tbody>
              </table>
              {depsFilt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin depositos registrados</div>}
            </div>
          </div>
        )}

        {/* MODAL IMPORTAR CSV */}
        {cobModalImport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCobModalImport(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 440, maxWidth: '95vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Importar CSV</div>
                <button onClick={() => setCobModalImport(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: t3, marginBottom: 16 }}>
                Importando a: <strong style={{ color: accent }}>{cobTab === 'ventas' ? 'Ventas' : cobTab === 'cuentas' ? 'Cuentas por Cobrar' : 'Depositos'}</strong>
              </div>
              <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: 40, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 12, color: t3, marginBottom: 12 }}>Arrastra un archivo CSV o haz clic para seleccionar</div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportCSV} style={{ fontSize: 12 }} />
              </div>
              <div style={{ fontSize: 10, color: t3 }}>Las columnas del CSV deben coincidir con los campos de la tabla.</div>
            </div>
          </div>
        )}

        {/* MODAL AGREGAR REGISTRO */}
        {cobModalAdd && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCobModalAdd(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 440, maxWidth: '95vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Agregar registro</div>
                <button onClick={() => setCobModalAdd(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {addFields.map(field => (
                  <div key={field}>
                    <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5, textTransform: 'capitalize' }}>{field.replace(/_/g, ' ')}</label>
                    <input type={['monto','vencido','por_vencer','depositado'].includes(field) ? 'number' : 'text'} value={cobNewRecord[field] || ''} onChange={ev => setCobNewRecord((p: any) => ({ ...p, [field]: ev.target.value }))} style={inputStyle} placeholder={field.replace(/_/g, ' ')} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setCobModalAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleAddRecord} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
      </PageTransition>
    </AppShell>
  )
}
