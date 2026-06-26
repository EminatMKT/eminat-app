import { useState, useEffect } from 'react'
import { useApp, MESES } from '@/shared/context/AppContext'
import { cobranzasRepo } from '@/shared/data'
import { escapeHtml } from '@/shared/lib/html'
import { fmt } from '../format'
import { TABLE, ADD_FIELDS, NUMERIC_FIELDS, EXPORT_HEADERS, TAB_TITLE } from './../constants'
import type { CobTab, Filtros, Venta, Cuenta, Deposito } from '../types'

const num = (v: unknown) => Number(v) || 0

export function useCobranzasData() {
  const { modules, mostrarMensaje } = useApp()
  const canCobranzas = modules.includes('cobranzas')

  const [cobTab, setCobTab] = useState<CobTab>('ventas')
  const [cobMes, setCobMes] = useState(MESES[new Date().getMonth()])
  const [cobVentas, setCobVentas] = useState<Venta[]>([])
  const [cobCuentas, setCobCuentas] = useState<Cuenta[]>([])
  const [cobDepositos, setCobDepositos] = useState<Deposito[]>([])
  const [cobFiltros, setCobFiltros] = useState<Filtros>({ periodo: '', laboratorio: '', estudio: '', banco: '', contratante: '', tipo: '' })
  const [cobModalImport, setCobModalImport] = useState(false)
  const [cobModalAdd, setCobModalAdd] = useState(false)
  const [cobNewRecord, setCobNewRecord] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (!canCobranzas) return
    const load = async () => {
      const [v, c, d] = await Promise.all([
        cobranzasRepo.list('cobranzas_ventas'),
        cobranzasRepo.list('cobranzas_cuentas'),
        cobranzasRepo.list('cobranzas_depositos'),
      ])
      setCobVentas(v.data || [])
      setCobCuentas(c.data || [])
      setCobDepositos(d.data || [])
    }
    load()
  }, [canCobranzas])

  const refresh = async (tab: CobTab) => {
    const { data } = await cobranzasRepo.list(TABLE[tab])
    if (tab === 'ventas') setCobVentas(data || [])
    else if (tab === 'cuentas') setCobCuentas(data || [])
    else setCobDepositos(data || [])
  }

  // --- Ventas ---
  const ventasFilt = cobVentas.filter(v => {
    if (cobFiltros.periodo && v.periodo !== cobFiltros.periodo) return false
    if (cobFiltros.laboratorio && v.laboratorio !== cobFiltros.laboratorio) return false
    if (cobFiltros.estudio && v.estudio !== cobFiltros.estudio) return false
    return true
  })
  const totalVentas = ventasFilt.reduce((s, v) => s + num(v.monto), 0)
  const ventas1Q = ventasFilt.filter(v => v.periodo === '1Q').reduce((s, v) => s + num(v.monto), 0)
  const ventas2Q = ventasFilt.filter(v => v.periodo === '2Q').reduce((s, v) => s + num(v.monto), 0)
  const ventasLabs = Object.entries(ventasFilt.reduce((m: any, v) => { m[v.laboratorio || 'N/A'] = (m[v.laboratorio || 'N/A'] || 0) + num(v.monto); return m }, {})).map(([name, value]) => ({ name, value: Number(value) }))
  const ventasEstudios = Object.entries(ventasFilt.reduce((m: any, v) => { m[v.estudio || 'N/A'] = (m[v.estudio || 'N/A'] || 0) + num(v.monto); return m }, {})).map(([name, value]) => ({ name, value: Number(value) }))
  const labsUniq = Array.from(new Set(cobVentas.map(v => v.laboratorio).filter(Boolean)))
  const estudiosUniqV = Array.from(new Set(cobVentas.map(v => v.estudio).filter(Boolean)))

  // --- Cuentas ---
  const cuentasFilt = cobCuentas.filter(c => {
    if (cobFiltros.laboratorio && c.laboratorio !== cobFiltros.laboratorio) return false
    if (cobFiltros.estudio && c.estudio !== cobFiltros.estudio) return false
    return true
  })
  const totalVencido = cuentasFilt.reduce((s, c) => s + num(c.vencido), 0)
  const totalPorVencer = cuentasFilt.reduce((s, c) => s + num(c.por_vencer), 0)
  const totalAdeudado = totalVencido + totalPorVencer
  const cuentasDonut = [{ name: 'Past Due', value: totalVencido }, { name: 'Upcoming', value: totalPorVencer }]
  const cuentasEstudios = Object.entries(cuentasFilt.reduce((m: any, c) => { const k = c.estudio || 'N/A'; if (!m[k]) m[k] = { vencido: 0, por_vencer: 0 }; m[k].vencido += num(c.vencido); m[k].por_vencer += num(c.por_vencer); return m }, {})).map(([name, v]: any) => ({ name, vencido: v.vencido, por_vencer: v.por_vencer }))
  const labsUniqC = Array.from(new Set(cobCuentas.map(c => c.laboratorio).filter(Boolean)))
  const estudiosUniqC = Array.from(new Set(cobCuentas.map(c => c.estudio).filter(Boolean)))

  // --- Depositos ---
  const depsFilt = cobDepositos.filter(d => {
    if (cobFiltros.periodo && d.periodo !== cobFiltros.periodo) return false
    if (cobFiltros.banco && d.banco !== cobFiltros.banco) return false
    if (cobFiltros.contratante && d.contratante !== cobFiltros.contratante) return false
    return true
  })
  const totalDep = depsFilt.reduce((s, d) => s + num(d.depositado), 0)
  const dep1Q = depsFilt.filter(d => d.periodo === '1Q').reduce((s, d) => s + num(d.depositado), 0)
  const dep2Q = depsFilt.filter(d => d.periodo === '2Q').reduce((s, d) => s + num(d.depositado), 0)
  const depBancos = Object.entries(depsFilt.reduce((m: any, d) => { m[d.banco || 'N/A'] = (m[d.banco || 'N/A'] || 0) + num(d.depositado); return m }, {})).map(([name, value]) => ({ name, value: Number(value) }))
  const depContratantes = Object.entries(depsFilt.reduce((m: any, d) => { m[d.contratante || 'N/A'] = (m[d.contratante || 'N/A'] || 0) + num(d.depositado); return m }, {})).map(([name, value]) => ({ name, value: Number(value) }))
  const bancosUniq = Array.from(new Set(cobDepositos.map(d => d.banco).filter(Boolean)))
  const contratantesUniq = Array.from(new Set(cobDepositos.map(d => d.contratante).filter(Boolean)))

  const clearFilters = () => setCobFiltros({ periodo: '', laboratorio: '', estudio: '', banco: '', contratante: '', tipo: '' })

  const handleExport = () => {
    let rows: any[] = []
    const headers = EXPORT_HEADERS[cobTab]
    if (cobTab === 'ventas') rows = ventasFilt.map(v => [v.mes, v.periodo, v.laboratorio, v.estudio, v.monto])
    else if (cobTab === 'cuentas') rows = cuentasFilt.map(c => [c.laboratorio, c.estudio, c.tipo, c.vencido, c.por_vencer, num(c.vencido) + num(c.por_vencer)])
    else rows = depsFilt.map(d => [d.periodo, d.contratante, d.banco, d.identificacion, d.estudio, d.depositado])
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
    if (lines.length < 2) { mostrarMensaje('error', 'Empty file'); return }
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase().replace(/ /g, '_'))
    const records = lines.slice(1).map((line: string) => {
      const vals = line.split(',').map((v: string) => v.trim())
      const obj: any = {}
      headers.forEach((h: string, i: number) => { obj[h] = vals[i] || '' })
      return obj
    })
    const { error } = await cobranzasRepo.insert(TABLE[cobTab], records)
    if (error) { mostrarMensaje('error', 'Import error: ' + error.message); return }
    mostrarMensaje('ok', `${records.length} records imported`)
    setCobModalImport(false)
    refresh(cobTab)
  }

  const handleAddRecord = async () => {
    const { error } = await cobranzasRepo.insert(TABLE[cobTab], [cobNewRecord])
    if (error) { mostrarMensaje('error', 'Error: ' + error.message); return }
    mostrarMensaje('ok', 'Record added')
    setCobModalAdd(false)
    setCobNewRecord({})
    refresh(cobTab)
  }

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    const title = TAB_TITLE[cobTab]
    const headers = EXPORT_HEADERS[cobTab]
    const head = `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
    let body = ''
    if (cobTab === 'ventas') {
      body = `<tbody>${ventasFilt.map(v => `<tr><td>${escapeHtml(v.mes)}</td><td>${escapeHtml(v.periodo)}</td><td>${escapeHtml(v.laboratorio)}</td><td>${escapeHtml(v.estudio)}</td><td>${fmt(num(v.monto))}</td></tr>`).join('')}</tbody>`
    } else if (cobTab === 'cuentas') {
      body = `<tbody>${cuentasFilt.map(c => `<tr><td>${escapeHtml(c.laboratorio)}</td><td>${escapeHtml(c.estudio)}</td><td>${escapeHtml(c.tipo)}</td><td>${fmt(num(c.vencido))}</td><td>${fmt(num(c.por_vencer))}</td><td>${fmt(num(c.vencido) + num(c.por_vencer))}</td></tr>`).join('')}</tbody>`
    } else {
      body = `<tbody>${depsFilt.map(d => `<tr><td>${escapeHtml(d.periodo)}</td><td>${escapeHtml(d.contratante)}</td><td>${escapeHtml(d.banco)}</td><td>${escapeHtml(d.identificacion)}</td><td>${escapeHtml(d.estudio)}</td><td>${fmt(num(d.depositado))}</td></tr>`).join('')}</tbody>`
    }
    const tableHtml = `<table>${head}${body}</table>`
    w.document.write(`<!DOCTYPE html><html><head><title>Cobranzas — ${escapeHtml(title)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,Arial,sans-serif;padding:40px 50px;font-size:12px;color:#111}h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f5f5f5;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #ddd}td{padding:8px 10px;border-bottom:1px solid #eee}@media print{.no-print{display:none!important}}</style></head><body><h1>EMINAT LLC — Billing Dashboard</h1><h2>${escapeHtml(title)} · ${escapeHtml(cobMes)} 2026</h2>${tableHtml}<div class="no-print" style="text-align:center;margin-top:30px"><button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;font-size:13px;cursor:pointer">Print</button></div></body></html>`)
    w.document.close()
  }

  const addFields = ADD_FIELDS[cobTab]
  const isNumericField = (field: string) => NUMERIC_FIELDS.includes(field)

  return {
    canCobranzas,
    cobTab, setCobTab, cobMes, setCobMes,
    cobFiltros, setCobFiltros, clearFilters,
    cobModalImport, setCobModalImport, cobModalAdd, setCobModalAdd,
    cobNewRecord, setCobNewRecord, addFields, isNumericField,
    handleExport, handleImportCSV, handleAddRecord, handlePrint,
    // ventas
    ventasFilt, totalVentas, ventas1Q, ventas2Q, ventasLabs, ventasEstudios, labsUniq, estudiosUniqV,
    // cuentas
    cuentasFilt, totalVencido, totalPorVencer, totalAdeudado, cuentasDonut, cuentasEstudios, labsUniqC, estudiosUniqC,
    // depositos
    depsFilt, totalDep, dep1Q, dep2Q, depBancos, depContratantes, bancosUniq, contratantesUniq,
  }
}
