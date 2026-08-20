import { useState } from 'react'
import { useApp, MESES, MESES_Q, mesATrimestre } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { actividadesRepo, notificacionesRepo } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { escapeHtml } from '@/shared/utils/html'
import { isExcludedFromStratix360 } from '../team'
import { esActividadDeMiembro, totalesProduccion } from '../report-filter'
import type { Actividad, NuevaActForm } from '../types'
import { useUserPreference } from '@/shared/hooks/useUserPreference'
import { oneOf } from '@/shared/hooks/usePersistedState'
import { ESTADO, ESTADO_COLORS } from '@/shared/constants/domain'

const emptyNuevaAct = (solicitanteId = ''): NuevaActForm => ({
  titulo: '', descripcion: '', empresa: '', responsable_id: '',
  mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '',
  estado: ESTADO.PENDIENTE, fecha_entrega: '', solicitante_id: solicitanteId, drive_url: '',
})

export function useStratixData() {
  const { usuario, actividades, equipo, esAdmin, mostrarMensaje, setActividades, miembrosPorId, miembrosAsignables, colorMarca } = useApp()
  const { t } = useT()

  const [mktTab, setMktTab] = useUserPreference('tab-stratix', 'kanban', oneOf('overview', 'kanban', 'solicitudes', 'social', 'competencia', 'equipo', 'reporte'))
  const [trimestre, setTrimestre] = useState('General')
  const [mesKanban, setMesKanban] = useState('')
  const [mesReporte, setMesReporte] = useState(MESES[new Date().getMonth()])
  const [miembroReporte, setMiembroReporte] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [modalNuevaAct, setModalNuevaAct] = useState(false)
  const [modalVerAct, setModalVerAct] = useState<Actividad | null>(null)
  const [creandoAct, setCreandoAct] = useState(false)
  const [nuevaAct, setNuevaAct] = useState<NuevaActForm>(emptyNuevaAct(usuario?.id || ''))
  const [busquedaSol, setBusquedaSol] = useState('')
  const [filtroEstadoSol, setFiltroEstadoSol] = useState('All')
  const [solTab, setSolTab] = useState('lista')

  // Computed values
  const mesesQ = MESES_Q[trimestre]
  const actsFiltradas = trimestre === 'General' ? actividades : actividades.filter(a => mesesQ.includes(a.mes))
  const totalQ = actsFiltradas.length
  const completadasQ = actsFiltradas.filter(a => a.estado === ESTADO.COMPLETADO).length
  const enProcesoQ = actsFiltradas.filter(a => a.estado === ESTADO.EN_PROCESO).length
  const pendientesQ = actsFiltradas.filter(a => a.estado === ESTADO.PENDIENTE).length
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
    completadas: actividades.filter(a => a.mes === mes && a.estado === ESTADO.COMPLETADO).length,
  }))
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)
  // Las barras salen de las marcas que las actividades REALMENTE usan, no del
  // catálogo de las ofrecibles: si se desactiva una empresa, sus actividades
  // siguen contando en los totales de arriba, así que su barra tiene que seguir
  // acá o la suma de las barras deja de dar el total. Mismo criterio que
  // `colorMarca`, que tampoco filtra.
  const codigosUsados = Array.from(new Set(actsFiltradas.map(a => a.empresa)))
  const datosPorMarca = codigosUsados
    .map(codigo => ({
      codigo,
      // BrandBar tipa `color` como requerido y el catálogo lo declara opcional.
      color: colorMarca[codigo] ?? COLOR_MARCA_FALLBACK,
      total: actsFiltradas.filter(a => a.empresa === codigo).length,
    }))
    .filter(m => m.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxMarca = Math.max(...datosPorMarca.map(d => d.total), 1)
  const idsTeam = esAdmin ? miembrosAsignables.map((m) => m.id) : [usuario?.id].filter(Boolean) as string[]
  const datosPorMiembro = idsTeam.map(id => ({
    id, nombre: miembrosPorId[id] ?? '—',
    total: actsFiltradas.filter(a => a.responsable_id === id).length,
    completadas: actsFiltradas.filter(a => a.responsable_id === id && a.estado === ESTADO.COMPLETADO).length,
    horas: Math.round(actsFiltradas.filter(a => a.responsable_id === id).reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  const maxMiembro = Math.max(...datosPorMiembro.map(d => d.total), 1)

  const actsFiltradasSol = actividades
    .filter(a => filtroEstadoSol === 'All' || a.estado === filtroEstadoSol)
    .filter(a => busquedaSol === '' || a.titulo?.toLowerCase().includes(busquedaSol.toLowerCase()) || a.empresa?.toLowerCase().includes(busquedaSol.toLowerCase()))

  const mesesDisponibles = actividades.map(a => a.mes).filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i)
  const actsKanban = mesKanban ? actividades.filter(a => a.mes === mesKanban) : actividades
  const porColumna = (col: string) => actsKanban.filter(a => a.estado === col)

  // Horas y Gantt son bloques del TABLERO: leen del mismo conjunto que las gráficas, así que
  // el filtro de trimestre los mueve a los tres a la vez. Antes cada uno tenía su propio
  // selector —un mes acá, un Week/Month/Qn allá— y podían estar mirando períodos distintos.
  const resumenHoras = idsTeam.map(id => {
    const acts = actsFiltradas.filter(a => a.responsable_id === id)
    return { id, nombre: miembrosPorId[id] ?? '—', total: acts.length, completadas: acts.filter(a => a.estado === ESTADO.COMPLETADO).length, horas: Math.round(acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10, dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0) }
  }).filter(r => r.total > 0)

  const idRep = miembroReporte || idsTeam[0] || ''
  // El listado incluye lo solicitado; las horas y los días de producción, no
  // (ver `totalesProduccion`: se pagan una vez, a quien las ejecutó). La
  // divergencia entre `actsRep.length` y estas dos cifras es deliberada.
  const actsRep = actividades.filter(a => esActividadDeMiembro(a, idRep, mesReporte || undefined))
  const { horas: totalHorasRep, dias: totalDiasRep } = totalesProduccion(actsRep, idRep)
  const completadasRep = actsRep.filter(a => a.estado === ESTADO.COMPLETADO).length
  const nombreRep = miembrosPorId[idRep] ?? usuario?.nombre ?? '—'

  // Drag and drop
  const onDragStart = (id: string) => setDragId(id)
  const onDragOverCol = (col: string) => setDragOver(col)
  const onDragEnd = () => { setDragId(null); setDragOver(null) }

  async function onDrop(col: string) {
    if (!dragId) return
    const act = actividades.find(a => a.id === dragId)
    if (!act || act.estado === col) { setDragId(null); setDragOver(null); return }
    const { error } = await actividadesRepo.updateEstado(dragId, col)
    if (!error) {
      setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: col } : a))
      mostrarMensaje('ok', `Moved to "${col}"`)
    }
    setDragId(null)
    setDragOver(null)
  }

  async function crearActividad() {
    // Los tres son NOT NULL en la DB (`responsable_id` y `empresa` además son FK).
    // Sin este chequeo, un usuario de Stratix fuera de MKT —cuyo select de
    // responsable renderiza vacío porque `miembrosAsignables` lo está— manda
    // `responsable_id: ''` y recibe un `invalid input syntax for type uuid` crudo
    // de Postgres. La columna de texto vieja se lo tragaba en silencio.
    if (!nuevaAct.titulo.trim()) { mostrarMensaje('error', 'Title is required'); return }
    if (!nuevaAct.responsable_id) { mostrarMensaje('error', 'Assignee is required'); return }
    if (!nuevaAct.empresa) { mostrarMensaje('error', 'Brand / Area is required'); return }
    setCreandoAct(true)
    try {
      const payload: Record<string, unknown> = {
        titulo: nuevaAct.titulo.trim(),
        empresa: nuevaAct.empresa,
        responsable_id: nuevaAct.responsable_id,
        mes: nuevaAct.mes,
        trimestre: mesATrimestre[nuevaAct.mes] || 'Q1',
        estado: nuevaAct.estado,
        solicitante_id: nuevaAct.solicitante_id || null,
      }
      if (nuevaAct.descripcion) payload.descripcion = nuevaAct.descripcion
      if (nuevaAct.horas) payload.horas = Number(nuevaAct.horas)
      if (nuevaAct.dias_produccion) payload.dias_produccion = Number(nuevaAct.dias_produccion)
      if (nuevaAct.fecha_entrega) payload.fecha_entrega = nuevaAct.fecha_entrega
      if (nuevaAct.drive_url) payload.drive_url = nuevaAct.drive_url

      const { data, error } = await actividadesRepo.create(payload)
      if (error) { mostrarMensaje('error', `Error: ${error.message}`); setCreandoAct(false); return }

      setActividades(prev => [data, ...prev])

      if (data && nuevaAct.responsable_id && nuevaAct.responsable_id !== usuario?.id) {
        await notificacionesRepo.insert({ usuario_id: nuevaAct.responsable_id, tipo: 'tarea_asignada', titulo: 'New task assigned', mensaje: `"${nuevaAct.titulo}" — ${nuevaAct.empresa} · ${nuevaAct.mes}`, actividad_id: data.id, leida: false })
      }

      setModalNuevaAct(false)
      setNuevaAct(emptyNuevaAct(usuario?.id || ''))
      mostrarMensaje('ok', 'Task created successfully')
    } catch (e) {
      mostrarMensaje('error', 'Unexpected error creating the task')
    }
    setCreandoAct(false)
  }

  function handlePrintReport() {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    // El mismo mapa del catálogo, no una copia: era la cuarta lista de colores de estado.
    const estadoColor = (e: string) => ESTADO_COLORS[e] || '#999'
    const rows = actsRep.map((a, i: number) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#666">${i + 1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#111;font-weight:500">${escapeHtml(a.titulo || '')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555">${escapeHtml(a.empresa || '')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555">${escapeHtml(miembrosPorId[a.responsable_id ?? ''] ?? '—')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.horas || 0}h</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.dias_produccion || 0}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;text-align:center">${escapeHtml(a.mes || '')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center"><span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${estadoColor(a.estado)}20;color:${estadoColor(a.estado)};font-weight:600">${escapeHtml(a.estado || '')}</span></td>
    </tr>`).join('')
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(t('stratix.report.heading'))} — ${escapeHtml(nombreRep)}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111; padding:40px 50px; font-size:13px; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    </style></head><body>
    <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #222">
      <div style="font-size:24px;font-weight:800;letter-spacing:.5px">${escapeHtml(t('stratix.report.brand'))}</div>
      <div style="font-size:14px;font-weight:600;margin-top:4px;color:#444">${escapeHtml(t('stratix.report.title'))}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">${escapeHtml(t('stratix.report.teamMember'))}</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(nombreRep)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">${escapeHtml(t('stratix.report.period'))}</div>
        <div style="font-size:16px;font-weight:700">${escapeHtml(mesReporte)} 2026</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      ${[
        { label: t('stratix.report.totalTasks'), value: actsRep.length, color: '#7C6FF7' },
        { label: t('stratix.report.completed'), value: completadasRep, color: '#34D399' },
        { label: t('stratix.report.totalHours'), value: totalHorasRep + 'h', color: '#F472B6' },
        { label: t('stratix.report.prodDays'), value: totalDiasRep, color: '#60A5FA' }
      ].map(k => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${k.color}">${k.value}</div>
        <div style="font-size:10px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">${k.label}</div>
      </div>`).join('')}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead><tr style="background:#f8f8fa">
        ${['#', t('stratix.report.colTask'), t('stratix.report.colArea'), t('stratix.report.colAssignee'), t('stratix.report.colHours'), t('stratix.report.colProdDays'), t('stratix.report.colMonth'), t('stratix.report.colStatus')].map(h => `<th style="padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400">${escapeHtml(h)}</th>`).join('')}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${actsRep.length === 0 ? `<div style="text-align:center;padding:40px;color:#999">${escapeHtml(t('stratix.report.empty'))}</div>` : ''}
    <div style="margin-top:60px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:80px">
      <div style="text-align:center">
        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${escapeHtml(nombreRep)}</div>
        <div style="font-size:10px;color:#888;margin-top:2px">${escapeHtml(t('stratix.report.teamMember'))}</div>
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

  // Solo las que tienen fecha de entrega: sin fecha no hay barra que dibujar.
  const ganttActs = actsFiltradas
    .filter(a => a.fecha_entrega)
    .sort((a, b) => new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime())

  return {
    // state
    mktTab, setMktTab, trimestre, setTrimestre, mesKanban, setMesKanban,
    mesReporte, setMesReporte,
    miembroReporte, setMiembroReporte, dragId, dragOver,
    modalNuevaAct, setModalNuevaAct, modalVerAct, setModalVerAct,
    creandoAct, nuevaAct, setNuevaAct,
    busquedaSol, setBusquedaSol, filtroEstadoSol, setFiltroEstadoSol, actsFiltradasSol, solTab, setSolTab,
    // computed
    actsFiltradas, totalQ, completadasQ, enProcesoQ, pendientesQ, pctCompletado, totalHoras, totalDias,
    diasRestantes, horasDisponibles, equipoSinMi, datosPorMes, maxTotal, datosPorMarca, maxMarca, hoy,
    idsTeam, datosPorMiembro, maxMiembro, mesesDisponibles, actsKanban, porColumna,
    resumenHoras, idRep, actsRep, totalHorasRep, totalDiasRep, completadasRep, nombreRep,
    // handlers
    onDragStart, onDragOverCol, onDragEnd, onDrop, crearActividad, ganttActs, handlePrintReport,
  }
}
