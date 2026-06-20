import { useState } from 'react'
import { useApp, MESES, MESES_Q, mesATrimestre, MARCAS_LIST, MIEMBROS_REFS } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { escapeHtml } from '@/shared/lib/html'
import { ACTIVE_MIEMBROS_REFS, isExcludedFromStratix360 } from '../team'
import type { NuevaActForm } from '../types'

const emptyNuevaAct = (): NuevaActForm => ({
  titulo: '', descripcion: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn',
  mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '',
  estado: 'Pendiente', fecha_entrega: '', solicitado_por: 'Coord_MFreddy', drive_url: '',
})

export function useStratixData() {
  const { usuario, actividades, equipo, usuarios, esSuperAdmin, mostrarMensaje, setActividades } = useApp()

  const [mktTab, setMktTab] = useState('kanban')
  const [trimestre, setTrimestre] = useState('General')
  const [mesKanban, setMesKanban] = useState('')
  const [ganttVista, setGanttVista] = useState('Month')
  const [mesHoras, setMesHoras] = useState('')
  const [mesReporte, setMesReporte] = useState(MESES[new Date().getMonth()])
  const [miembroReporte, setMiembroReporte] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [modalNuevaAct, setModalNuevaAct] = useState(false)
  const [modalVerAct, setModalVerAct] = useState<any>(null)
  const [creandoAct, setCreandoAct] = useState(false)
  const [nuevaAct, setNuevaAct] = useState<NuevaActForm>(emptyNuevaAct())
  const [busquedaSol, setBusquedaSol] = useState('')
  const [filtroEstadoSol, setFiltroEstadoSol] = useState('All')
  const [solTab, setSolTab] = useState('lista')
  const [subVista, setSubVista] = useState('team')

  // Computed values
  const mesesQ = MESES_Q[trimestre]
  const actsFiltradas = trimestre === 'General' ? actividades : actividades.filter(a => mesesQ.includes(a.mes))
  const totalQ = actsFiltradas.length
  const completadasQ = actsFiltradas.filter(a => a.estado === 'Completado').length
  const enProcesoQ = actsFiltradas.filter(a => a.estado === 'En proceso').length
  const pendientesQ = actsFiltradas.filter(a => a.estado === 'Pendiente').length
  const pctCompletado = totalQ > 0 ? Math.round((completadasQ / totalQ) * 100) : 0
  const totalHoras = Math.round(actsFiltradas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDias = actsFiltradas.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const hoy = new Date()
  const diasRestantes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - hoy.getDate()
  const horasDisponibles = diasRestantes * 8
  const equipoSinMi = equipo.filter((u) => u.nombre !== usuario?.nombre && !isExcludedFromStratix360(u))
  const mesesFull = trimestre === 'General' ? MESES_Q['General'] : mesesQ
  const mesesGraf = trimestre === 'General' ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] : mesesQ.map(m => m.slice(0, 3))
  const datosPorMes = mesesFull.map((mes, i) => ({
    mes: mesesGraf[i],
    total: actividades.filter(a => a.mes === mes).length,
    completadas: actividades.filter(a => a.mes === mes && a.estado === 'Completado').length,
  }))
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)
  const datosPorMarca = MARCAS_LIST.map(m => ({ ...m, total: actsFiltradas.filter(a => a.area_ref === m.codigo).length })).filter(m => m.total > 0)
  const maxMarca = Math.max(...datosPorMarca.map(d => d.total), 1)
  const refsTeam = esSuperAdmin ? Object.keys(ACTIVE_MIEMBROS_REFS) : [usuario?.responsable_ref].filter(Boolean)
  const datosPorMiembro = refsTeam.map(ref => ({
    ref, nombre: MIEMBROS_REFS[ref] || ref,
    total: actsFiltradas.filter(a => a.responsable_ref === ref).length,
    completadas: actsFiltradas.filter(a => a.responsable_ref === ref && a.estado === 'Completado').length,
    horas: Math.round(actsFiltradas.filter(a => a.responsable_ref === ref).reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  const maxMiembro = Math.max(...datosPorMiembro.map(d => d.total), 1)

  const actsFiltradasSol = actividades
    .filter(a => filtroEstadoSol === 'All' || a.estado === filtroEstadoSol)
    .filter(a => busquedaSol === '' || a.titulo?.toLowerCase().includes(busquedaSol.toLowerCase()) || a.area_ref?.toLowerCase().includes(busquedaSol.toLowerCase()))

  const mesesDisponibles = actividades.map(a => a.mes).filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i)
  const actsKanban = mesKanban ? actividades.filter(a => a.mes === mesKanban) : actividades
  const porColumna = (col: string) => actsKanban.filter(a => a.estado === col)

  const actsHoras = mesHoras ? actividades.filter(a => a.mes === mesHoras) : actividades
  const resumenHoras = refsTeam.map(ref => {
    const acts = actsHoras.filter(a => a.responsable_ref === ref)
    return { ref, nombre: MIEMBROS_REFS[ref] || ref, total: acts.length, completadas: acts.filter(a => a.estado === 'Completado').length, horas: Math.round(acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10, dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0) }
  }).filter(r => r.total > 0)

  const refRep = miembroReporte || refsTeam[0] || ''
  const actsRep = actividades.filter(a => {
    if (!mesReporte) return a.responsable_ref === refRep || (refRep === 'Coord_MFreddy' && a.solicitado_por === refRep)
    const matchMes = a.mes === mesReporte
    if (refRep === 'Coord_MFreddy') return matchMes && (a.responsable_ref === refRep || a.solicitado_por === refRep)
    return matchMes && a.responsable_ref === refRep
  })
  const totalHorasRep = Math.round(actsRep.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDiasRep = actsRep.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const completadasRep = actsRep.filter(a => a.estado === 'Completado').length
  const nombreRep = MIEMBROS_REFS[refRep] || usuario?.nombre || refRep

  // Drag and drop
  const onDragStart = (id: string) => setDragId(id)
  const onDragOverCol = (col: string) => setDragOver(col)
  const onDragEnd = () => { setDragId(null); setDragOver(null) }

  async function onDrop(col: string) {
    if (!dragId) return
    const act = actividades.find(a => a.id === dragId)
    if (!act || act.estado === col) { setDragId(null); setDragOver(null); return }
    const { error } = await supabase.from('actividades').update({ estado: col }).eq('id', dragId)
    if (!error) {
      setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: col } : a))
      mostrarMensaje('ok', `Moved to "${col}"`)
    }
    setDragId(null)
    setDragOver(null)
  }

  async function crearActividad() {
    if (!nuevaAct.titulo.trim()) { mostrarMensaje('error', 'Title is required'); return }
    setCreandoAct(true)
    try {
      const payload: any = {
        titulo: nuevaAct.titulo.trim(),
        area_ref: nuevaAct.area_ref,
        responsable_ref: nuevaAct.responsable_ref,
        mes: nuevaAct.mes,
        trimestre: mesATrimestre[nuevaAct.mes] || 'Q1',
        estado: nuevaAct.estado,
        solicitado_por: nuevaAct.solicitado_por,
      }
      if (nuevaAct.descripcion) payload.descripcion = nuevaAct.descripcion
      if (nuevaAct.horas) payload.horas = Number(nuevaAct.horas)
      if (nuevaAct.dias_produccion) payload.dias_produccion = Number(nuevaAct.dias_produccion)
      if (nuevaAct.fecha_entrega) payload.fecha_entrega = nuevaAct.fecha_entrega
      if (nuevaAct.drive_url) payload.drive_url = nuevaAct.drive_url

      const { data, error } = await supabase.from('actividades').insert(payload).select().single()
      if (error) { mostrarMensaje('error', `Error: ${error.message}`); setCreandoAct(false); return }

      setActividades(prev => [data, ...prev])

      if (data && nuevaAct.responsable_ref !== usuario?.responsable_ref) {
        const responsableUser = usuarios.find((u: any) => u.responsable_ref === nuevaAct.responsable_ref)
        if (responsableUser?.id) {
          await supabase.from('notificaciones').insert({ usuario_id: responsableUser.id, tipo: 'tarea_asignada', titulo: 'New task assigned', mensaje: `"${nuevaAct.titulo}" — ${nuevaAct.area_ref} · ${nuevaAct.mes}`, actividad_id: data.id, leida: false })
        }
      }

      setModalNuevaAct(false)
      setNuevaAct(emptyNuevaAct())
      mostrarMensaje('ok', 'Task created successfully')
    } catch (e) {
      mostrarMensaje('error', 'Unexpected error creating the task')
    }
    setCreandoAct(false)
  }

  function handlePrintReport() {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    const estadoColor = (e: string) => ({ 'Completado': '#34D399', 'Por aprobar': '#FBB040', 'En proceso': '#7C6FF7', 'Pendiente': '#9494B3' }[e] || '#999')
    const rows = actsRep.map((a: any, i: number) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#666">${i + 1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#111;font-weight:500">${escapeHtml(a.titulo || '')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555">${escapeHtml(a.area_ref || '')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.horas || 0}h</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.dias_produccion || 0}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;text-align:center">${escapeHtml(a.mes || '')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center"><span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${estadoColor(a.estado)}20;color:${estadoColor(a.estado)};font-weight:600">${escapeHtml(a.estado || '')}</span></td>
    </tr>`).join('')
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    w.document.write(`<!DOCTYPE html><html><head><title>Production Report — ${escapeHtml(nombreRep)}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111; padding:40px 50px; font-size:13px; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    </style></head><body>
    <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #222">
      <div style="font-size:24px;font-weight:800;letter-spacing:.5px">Stratix Solutions</div>
      <div style="font-size:14px;font-weight:600;margin-top:4px;color:#444">Production Payment Report</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Team member</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(nombreRep)}</div>
        <div style="font-size:11px;color:#888;font-family:monospace;margin-top:2px">${escapeHtml(refRep)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Period</div>
        <div style="font-size:16px;font-weight:700">${escapeHtml(mesReporte)} 2026</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      ${[
        { label: 'Total tasks', value: actsRep.length, color: '#7C6FF7' },
        { label: 'Completed', value: completadasRep, color: '#34D399' },
        { label: 'Total hours', value: totalHorasRep + 'h', color: '#F472B6' },
        { label: 'Production days', value: totalDiasRep, color: '#60A5FA' }
      ].map(k => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${k.color}">${k.value}</div>
        <div style="font-size:10px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">${k.label}</div>
      </div>`).join('')}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead><tr style="background:#f8f8fa">
        ${['#', 'Task', 'Area', 'Hours', 'Prod. Days', 'Month', 'Status'].map(h => `<th style="padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${actsRep.length === 0 ? '<div style="text-align:center;padding:40px;color:#999">No tasks for this period</div>' : ''}
    <div style="margin-top:60px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:80px">
      <div style="text-align:center">
        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${escapeHtml(nombreRep)}</div>
        <div style="font-size:10px;color:#888;margin-top:2px">Team member</div>
      </div>
      <div style="text-align:center">
        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">Freddy Crespín</div>
        <div style="font-size:10px;color:#888;margin-top:2px">Marketing Coordinator — Approved by</div>
      </div>
    </div>
    <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
      <span>Generated on ${today}</span>
      <span>Stratix Solutions — Stratix 360</span>
    </div>
    <div class="no-print" style="text-align:center;margin-top:30px">
      <button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;font-size:13px;font-weight:600;cursor:pointer">Print</button>
    </div>
    </body></html>`)
    w.document.close()
  }

  const getGanttActs = () => {
    const mesesGantt: Record<string, string[]> = { Q1: ['Enero', 'Febrero', 'Marzo'], Q2: ['Abril', 'Mayo', 'Junio'], Q3: ['Julio', 'Agosto', 'Septiembre'], Q4: ['Octubre', 'Noviembre', 'Diciembre'] }
    let acts = actividades.filter(a => a.fecha_entrega)
    if (mesesGantt[ganttVista]) acts = acts.filter(a => mesesGantt[ganttVista].includes(a.mes))
    else if (ganttVista === 'Week') {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - hoy.getDay())
      const fin = new Date(ini); fin.setDate(ini.getDate() + 6)
      acts = acts.filter(a => { const f = new Date(a.fecha_entrega); return f >= ini && f <= fin })
    } else if (ganttVista === 'Month') {
      acts = acts.filter(a => { const f = new Date(a.fecha_entrega); return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear() })
    }
    return acts.sort((a, b) => new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime())
  }

  return {
    // state
    mktTab, setMktTab, trimestre, setTrimestre, mesKanban, setMesKanban,
    ganttVista, setGanttVista, mesHoras, setMesHoras, mesReporte, setMesReporte,
    miembroReporte, setMiembroReporte, dragId, dragOver,
    modalNuevaAct, setModalNuevaAct, modalVerAct, setModalVerAct,
    creandoAct, nuevaAct, setNuevaAct,
    busquedaSol, setBusquedaSol, filtroEstadoSol, setFiltroEstadoSol, actsFiltradasSol, solTab, setSolTab, subVista, setSubVista,
    // computed
    actsFiltradas, totalQ, completadasQ, enProcesoQ, pendientesQ, pctCompletado, totalHoras, totalDias,
    diasRestantes, horasDisponibles, equipoSinMi, datosPorMes, maxTotal, datosPorMarca, maxMarca, hoy,
    refsTeam, datosPorMiembro, maxMiembro, mesesDisponibles, actsKanban, porColumna,
    resumenHoras, refRep, actsRep, totalHorasRep, totalDiasRep, completadasRep, nombreRep,
    // handlers
    onDragStart, onDragOverCol, onDragEnd, onDrop, crearActividad, getGanttActs, handlePrintReport,
  }
}
