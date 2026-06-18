'use client'

import { useState } from 'react'
import { useApp, MESES, MESES_Q, TRIMESTRES, mesATrimestre, MARCAS_LIST, ESTADO_COLORS, COLUMNAS_KANBAN, MIEMBROS_REFS, SOLICITANTES, getColorMarca } from '@/shared/context/AppContext'
import AppShell from '@/app/components/AppShell'
import { supabase } from '@/shared/db/supabase'
import { PageTransition, StaggerGrid, StaggerItem, AnimatedNumber, FadeInSection } from '@/shared/motion'

// ── Stratix 360 team-facing exclusions ────────────────────────────────────
// Defense in depth: filter by BOTH normalized name AND email, so we catch
// the person even if the email in usuarios / v_equipo_hoy ever differs from
// what we expect (or comes back null).
//
// Spreadsheet refs (Jonathan_CRM) are excluded separately because the
// Disponibilidad / Team-ranking / Report panels iterate over MIEMBROS_REFS
// keys, not usuarios rows.
const STRATIX360_EXCLUDED_NAMES = new Set(['javier andrade', 'jonathan bula'])
const STRATIX360_EXCLUDED_EMAILS = new Set([
  'javier@emc.health',
  'javier@eminat.net',
  'jonathan@eminat.net',
])
const STRATIX360_EXCLUDED_REFS = new Set(['Jonathan_CRM'])

function normTeamName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function isExcludedFromStratix360(u?: { nombre?: string | null; apellido?: string | null; email?: string | null } | null): boolean {
  if (!u) return false
  const email = (u.email || '').toLowerCase()
  if (email && STRATIX360_EXCLUDED_EMAILS.has(email)) return true
  const name = normTeamName(`${u.nombre || ''} ${u.apellido || ''}`)
  if (name && STRATIX360_EXCLUDED_NAMES.has(name)) return true
  return false
}

// MIEMBROS_REFS minus the refs that should not appear in team-iteration UIs.
// The MIEMBROS_REFS[ref] LOOKUP (used to display assignee names on historic
// activities) is left untouched, so old tasks still show "Jonathan" instead
// of a raw "Jonathan_CRM" string.
const ACTIVE_MIEMBROS_REFS: Record<string, string> = Object.fromEntries(
  Object.entries(MIEMBROS_REFS).filter(([ref]) => !STRATIX360_EXCLUDED_REFS.has(ref))
)

export default function StratixMktPage() {
  const {
    usuario, actividades, equipo, usuarios, dark,
    esSuperAdmin, mostrarMensaje, setActividades,
    s1, s2, s3, border, t1, t2, t3, accent, inputStyle, onlineCount,
  } = useApp()

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
  const [nuevaAct, setNuevaAct] = useState({
    titulo: '', descripcion: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn',
    mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '',
    estado: 'Pendiente', fecha_entrega: '', solicitado_por: 'Coord_MFreddy', drive_url: '',
  })
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
  // Team-facing exclusion applied to Marketing Today / Stratix 360 Today.
  // Uses the module-scope isExcludedFromStratix360() helper which checks
  // BOTH normalized name AND email.
  const equipoSinMi = equipo.filter((u) =>
    u.nombre !== usuario?.nombre && !isExcludedFromStratix360(u)
  )
  const mesesFull = trimestre === 'General' ? MESES_Q['General'] : mesesQ
  const mesesGraf = trimestre === 'General' ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'] : mesesQ.map(m => m.slice(0, 3))
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
  function onDragStart(id: string) { setDragId(id) }
  function onDragOverCol(col: string) { setDragOver(col) }
  function onDragEnd() { setDragId(null); setDragOver(null) }

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
      setNuevaAct({ titulo: '', descripcion: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn', mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '', estado: 'Pendiente', fecha_entrega: '', solicitado_por: 'Coord_MFreddy', drive_url: '' })
      mostrarMensaje('ok', 'Task created successfully')
    } catch (e) {
      mostrarMensaje('error', 'Unexpected error creating the task')
    }
    setCreandoAct(false)
  }

  const getGanttActs = () => {
    const mesesGantt: Record<string, string[]> = { Q1: ['Enero','Febrero','Marzo'], Q2: ['Abril','Mayo','Junio'], Q3: ['Julio','Agosto','Septiembre'], Q4: ['Octubre','Noviembre','Diciembre'] }
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

  return (
    <AppShell
      activeTab={mktTab}
      onTabChange={setMktTab}
      actions={mktTab === 'kanban' ? (
        <button onClick={() => { setNuevaAct(p => ({ ...p, estado: 'Pendiente' })); setModalNuevaAct(true) }}
          style={{ padding: '7px 16px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span> New task
        </button>
      ) : undefined}
    >
      <PageTransition>
      <div>
        {/* MKT TABS */}
        {(mktTab === 'overview' || mktTab === 'kanban' || mktTab === 'gantt' || mktTab === 'horas') && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
            {[{ key: 'overview', label: '📊 Overview' }, { key: 'kanban', label: '⚡ Kanban' }, { key: 'gantt', label: '📊 Gantt' }, { key: 'horas', label: '⏱ Hours' }].map(t => (
              <button key={t.key} onClick={() => setMktTab(t.key)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: mktTab === t.key ? t1 : t3, borderBottom: mktTab === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
            ))}
          </div>
        )}

        {/* OVERVIEW */}
        {mktTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
              {TRIMESTRES.map(q => (
                <button key={q} onClick={() => setTrimestre(q)} style={{ padding: '5px 16px', borderRadius: 20, border: `1px solid ${trimestre === q ? accent : border}`, background: trimestre === q ? accent : 'transparent', color: trimestre === q ? 'white' : t2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{q}</button>
              ))}
            </div>
            <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Total Tasks', value: totalQ, color: accent, sub: 'tasks' },
                { label: 'Completed', value: completadasQ, color: '#34D399', sub: `${pctCompletado}% completion rate` },
                { label: 'In Progress', value: enProcesoQ, color: '#FBB040', sub: 'in progress' },
                { label: 'Pending', value: pendientesQ, color: '#9494B3', sub: 'not started' },
                { label: 'Total Hours', value: `${totalHoras}h`, color: '#F472B6', sub: `${totalDias} prod. days` },
                { label: 'Available Hours', value: `${horasDisponibles}h`, color: '#60A5FA', sub: `${diasRestantes} days remaining` },
              ].map(k => (
                <StaggerItem key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontFamily: 'DM Mono' }}>{k.label}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, lineHeight: 1, color: k.color }}>{typeof k.value === 'number' ? <AnimatedNumber value={k.value} /> : k.value}</div>
                  <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>{k.sub}</div>
                  <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: border }}>
                    <div style={{ height: 2, borderRadius: 1, background: k.color, width: `${pctCompletado}%` }} />
                  </div>
                </StaggerItem>
              ))}
            </StaggerGrid>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 270px', gap: 12, marginBottom: 14 }}>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Production by month — {trimestre}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90 }}>
                  {datosPorMes.map(d => (
                    <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 8, color: t3 }}>{d.total}</div>
                      <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 66 }}>
                        <div style={{ flex: 1, background: `${accent}30`, borderRadius: '3px 3px 0 0', height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? 3 : 0 }} />
                        <div style={{ flex: 1, background: '#34D399', borderRadius: '3px 3px 0 0', height: `${(d.completadas / maxTotal) * 100}%`, minHeight: d.completadas > 0 ? 3 : 0 }} />
                      </div>
                      <div style={{ fontSize: 9, color: t3 }}>{d.mes}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>By brand — {trimestre}</div>
                {datosPorMarca.map(m => (
                  <div key={m.codigo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: t2, width: 52 }}>{m.codigo}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: m.color, width: `${(m.total / maxMarca) * 100}%` }} />
                    </div>
                    <span style={{ fontSize: 10, color: t3, width: 24, textAlign: 'right' }}>{m.total}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Stratix 360 Today</div>
                  <span style={{ fontSize: 10, color: '#34D399' }}>{onlineCount > 0 ? onlineCount : 1} online</span>
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {equipoSinMi.map(u => {
                    const userInfo = usuarios.find(us => us.nombre === u.nombre)
                    const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                    return (
                      <div key={u.id} style={{ padding: '8px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{u.nombre}</div>
                          <div style={{ fontSize: 9, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Active now' : 'Offline'}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 12 }}>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Recent activity</div>
                  <button onClick={() => setMktTab('solicitudes')} style={{ fontSize: 10, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                </div>
                {actsFiltradas.slice(0, 6).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: `1px solid ${border}` }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: ESTADO_COLORS[a.estado] || t3, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                      <div style={{ fontSize: 9, color: t3 }}>{a.area_ref} · {a.responsable_ref} · {a.mes}</div>
                    </div>
                    <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 9, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3, whiteSpace: 'nowrap' }}>{a.estado}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Team ranking</div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {datosPorMiembro.map((m, i) => (
                    <div key={m.ref}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 9, color: t3, width: 12 }}>{i + 1}</span>
                          <span style={{ fontSize: 11, color: t1, fontWeight: 500 }}>{m.nombre}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 9, color: '#34D399' }}>{m.completadas}✓</span>
                          <span style={{ fontSize: 9, color: t3 }}>{m.horas}h</span>
                        </div>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: border, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${(m.total / maxMiembro) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KANBAN */}
        {mktTab === 'kanban' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: t3 }}>{actsKanban.length} tasks · Drag cards to change their status</div>
              <select value={mesKanban} onChange={e => setMesKanban(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                <option value="">All months</option>
                {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'start' }}>
              {COLUMNAS_KANBAN.map(col => (
                <div key={col} onDragOver={e => { e.preventDefault(); onDragOverCol(col) }} onDrop={() => onDrop(col)}
                  style={{ borderRadius: 14, overflow: 'hidden', minHeight: 100, background: dragOver === col ? `${ESTADO_COLORS[col]}08` : s2, border: dragOver === col ? `2px dashed ${ESTADO_COLORS[col]}` : `1px solid ${border}`, transition: 'all .15s' }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${ESTADO_COLORS[col]}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: ESTADO_COLORS[col] }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{col}</span>
                    </div>
                    <span style={{ fontSize: 11, color: t3, background: s3, padding: '1px 8px', borderRadius: 10, fontFamily: 'DM Mono' }}>{porColumna(col).length}</span>
                  </div>
                  <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {porColumna(col).map(a => {
                      const marcaColor = getColorMarca(a.area_ref)
                      const miembroInicial = Object.entries(MIEMBROS_REFS).find(([ref]) => ref === a.responsable_ref)
                      return (
                        <div key={a.id} draggable onDragStart={() => onDragStart(a.id)} onDragEnd={onDragEnd} onClick={() => setModalVerAct(a)}
                          style={{ background: s1, borderRadius: 12, padding: '12px 13px', border: `1px solid ${dragId === a.id ? accent : border}`, cursor: 'grab', opacity: dragId === a.id ? .4 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'all .15s' }}>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${marcaColor}25`, color: marcaColor, fontWeight: 600 }}>{a.area_ref}</span>
                            {a.mes && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${t3}20`, color: t3 }}>{a.mes}</span>}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t1, lineHeight: 1.4, marginBottom: 10 }}>{a.titulo}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                {miembroInicial?.[1]?.[0] || '?'}
                              </div>
                              <span style={{ fontSize: 10, color: t3 }}>{miembroInicial?.[1] || a.responsable_ref}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {a.horas && <span style={{ fontSize: 9, color: t3 }}>⏱ {a.horas}h</span>}
                              {a.fecha_entrega && <span style={{ fontSize: 9, color: new Date(a.fecha_entrega) < new Date() && a.estado !== 'Completado' ? '#F87171' : t3 }}>📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>}
                              {a.drive_url && <span style={{ fontSize: 9, color: '#60A5FA' }}>🔗</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {col === 'Pendiente' && (
                      <button onClick={() => { setNuevaAct(p => ({ ...p, estado: 'Pendiente' })); setModalNuevaAct(true) }}
                        style={{ padding: '8px', borderRadius: 10, border: `1px dashed ${border}`, background: 'transparent', color: t3, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>+</span> Add task
                      </button>
                    )}
                    {porColumna(col).length === 0 && col !== 'Pendiente' && (
                      <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: '20px', textAlign: 'center', color: t3, fontSize: 11 }}>Drop here</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GANTT */}
        {mktTab === 'gantt' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Gantt Chart</span>
                <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>View by due dates</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Week', 'Month', 'Q1', 'Q2', 'Q3', 'Q4'].map(v => (
                  <button key={v} onClick={() => setGanttVista(v)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${ganttVista === v ? accent : border}`, background: ganttVista === v ? accent : 'transparent', color: ganttVista === v ? 'white' : t2, cursor: 'pointer' }}>{v}</button>
                ))}
              </div>
            </div>
            {(() => {
              const actsGantt = getGanttActs()
              const fechas = actsGantt.map(a => new Date(a.fecha_entrega)).sort((a, b) => a.getTime() - b.getTime())
              const fechaMin = fechas[0] || hoy
              const fechaMax = fechas[fechas.length - 1] || new Date(hoy.getTime() + 30 * 86400000)
              const totalDiasGantt = Math.max(Math.ceil((fechaMax.getTime() - fechaMin.getTime()) / 86400000) + 1, 7)
              const diasMostrar = Math.min(totalDiasGantt, 31)
              return (
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
                    <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderRight: `1px solid ${border}` }}>Task / Assignee</div>
                    <div style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
                      {Array.from({ length: diasMostrar }).map((_, i) => {
                        const d = new Date(fechaMin.getTime() + i * 86400000)
                        const esHoy = d.toDateString() === hoy.toDateString()
                        const esFinde = d.getDay() === 0 || d.getDay() === 6
                        return (
                          <div key={i} style={{ minWidth: 44, textAlign: 'center', padding: '8px 4px', fontSize: 9, color: esHoy ? accent : esFinde ? '#F87171' : t3, fontFamily: 'DM Mono', background: esHoy ? `${accent}10` : esFinde ? 'rgba(248,113,113,0.05)' : 'transparent', borderRight: `1px solid ${border}` }}>
                            <div style={{ fontWeight: esHoy ? 700 : 400 }}>{d.getDate()}</div>
                            <div>{['D','L','M','X','J','V','S'][d.getDay()]}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                    {actsGantt.slice(0, 40).map(a => {
                      const fechaAct = new Date(a.fecha_entrega)
                      const diaOffset = Math.max(Math.ceil((fechaAct.getTime() - fechaMin.getTime()) / 86400000), 0)
                      const colorBarra = ESTADO_COLORS[a.estado] || accent
                      const diasProd = Math.max(Number(a.dias_produccion) || 1, 1)
                      return (
                        <div key={a.id} onClick={() => setModalVerAct(a)} style={{ display: 'flex', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
                          <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', borderRight: `1px solid ${border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                            <div style={{ fontSize: 9, color: t3, marginTop: 2 }}>
                              <span style={{ marginRight: 6 }}>{MIEMBROS_REFS[a.responsable_ref] || a.responsable_ref}</span>
                              <span style={{ padding: '1px 5px', borderRadius: 4, background: `${getColorMarca(a.area_ref)}25`, color: getColorMarca(a.area_ref), fontSize: 8 }}>{a.area_ref}</span>
                            </div>
                          </div>
                          <div style={{ flex: 1, position: 'relative', height: 48, overflowX: 'hidden' }}>
                            <div style={{ position: 'absolute', left: diaOffset * 44 + 4, top: '50%', transform: 'translateY(-50%)', height: 22, width: Math.max(diasProd * 44 - 8, 36), borderRadius: 8, background: `${colorBarra}25`, border: `1.5px solid ${colorBarra}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: colorBarra, flexShrink: 0 }} />
                              <span style={{ fontSize: 9, color: colorBarra, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{a.estado}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {actsGantt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>No tasks with a due date for this view</div>}
                  </div>
                  <div style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {Object.entries(ESTADO_COLORS).map(([estado, color]) => (
                      <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: t3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: `${color}30`, border: `1.5px solid ${color}` }} />
                        {estado}
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#F87171' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(248,113,113,0.1)', border: '1px solid #F87171' }} />
                      Weekend
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* HORAS */}
        {mktTab === 'horas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{esSuperAdmin ? 'Team summary' : 'Your hours'}</span>
              <select value={mesHoras} onChange={e => setMesHoras(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                <option value="">All months</option>
                {MESES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {resumenHoras.map(r => (
                <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                      <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{r.ref}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 30, fontWeight: 800, color: '#60A5FA', lineHeight: 1 }}>{r.horas}h</div>
                      <div style={{ fontSize: 10, color: t3 }}>{r.dias} production days</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                    {[{ label: 'Total tasks', value: r.total, color: t1 }, { label: 'Completed', value: r.completadas, color: '#34D399' }, { label: 'Completion rate', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent }].map(s => (
                      <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: border, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: '#34D399', width: `${r.total > 0 ? (r.completadas / r.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOLICITUDES */}
        {mktTab === 'solicitudes' && (
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${border}` }}>
              {[{ key: 'lista', label: '📋 Task list' }, { key: 'disponibilidad', label: '🗓 Availability' }].map(t => (
                <button key={t.key} onClick={() => setSolTab(t.key)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: solTab === t.key ? t1 : t3, borderBottom: solTab === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
              ))}
            </div>

            {solTab === 'lista' && (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="text" placeholder="Search by title, area..." value={busquedaSol} onChange={e => setBusquedaSol(e.target.value)} style={{ ...inputStyle, width: 280 }} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['All','Pendiente','En proceso','Por aprobar','Completado'].map(e => (
                      <button key={e} onClick={() => setFiltroEstadoSol(e)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : border}`, background: filtroEstadoSol === e ? `${ESTADO_COLORS[e] || accent}20` : 'transparent', color: filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : t2, cursor: 'pointer' }}>{e}</button>
                    ))}
                  </div>
                </div>
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: s2 }}>
                          {['Title', 'Brand', ...(esSuperAdmin ? ['Assignee'] : []), 'Month', 'Hours', 'Status', 'Due', 'Drive'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {actividades
                          .filter(a => filtroEstadoSol === 'All' || a.estado === filtroEstadoSol)
                          .filter(a => busquedaSol === '' || a.titulo?.toLowerCase().includes(busquedaSol.toLowerCase()) || a.area_ref?.toLowerCase().includes(busquedaSol.toLowerCase()))
                          .map(a => (
                            <tr key={a.id} onClick={() => setModalVerAct(a)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{a.titulo}</div>
                                {a.descripcion && <div style={{ fontSize: 10, color: t3, marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descripcion}</div>}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${getColorMarca(a.area_ref)}25`, color: getColorMarca(a.area_ref), fontWeight: 600 }}>{a.area_ref}</span>
                              </td>
                              {esSuperAdmin && <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{MIEMBROS_REFS[a.responsable_ref] || a.responsable_ref}</td>}
                              <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{a.mes}</td>
                              <td style={{ padding: '10px 14px', fontSize: 11, color: t3, fontFamily: 'DM Mono' }}>{a.horas}h</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{a.estado}</span>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: 11, color: a.fecha_entrega && new Date(a.fecha_entrega) < new Date() && a.estado !== 'Completado' ? '#F87171' : t3 }}>
                                {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('en-US') : '—'}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {a.drive_url ? <a href={a.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: '#60A5FA', textDecoration: 'none' }}>🔗 View</a> : <span style={{ fontSize: 10, color: t3 }}>—</span>}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {solTab === 'disponibilidad' && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Syne', color: t1, marginBottom: 4 }}>Team availability</div>
                  <div style={{ fontSize: 12, color: t3 }}>Monday to Friday · 9:00 AM — 6:00 PM · Guayaquil, Ecuador time</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {Object.entries(ACTIVE_MIEMBROS_REFS).map(([ref, nombre]) => {
                    const tareasActivas = actividades.filter(a => a.responsable_ref === ref && (a.estado === 'En proceso' || a.estado === 'Pendiente'))
                    const horasOcupadas = Math.round(tareasActivas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
                    const horasSemanales = 40
                    const horasLibres = Math.max(horasSemanales - horasOcupadas, 0)
                    const pctOcupado = Math.min((horasOcupadas / horasSemanales) * 100, 100)
                    const disponible = pctOcupado < 75
                    const slots = [9, 10, 11, 12, 13, 14, 15, 16, 17]
                    const userInfo = usuarios.find(u => u.responsable_ref === ref)
                    const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                    return (
                      <div key={ref} style={{ background: s1, border: `2px solid ${disponible ? '#34D39930' : '#F8717130'}`, borderRadius: 16, padding: 18, transition: 'all .2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ position: 'relative' }}>
                              <div style={{ width: 38, height: 38, borderRadius: '50%', background: userInfo?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                                {nombre[0]}
                              </div>
                              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{nombre}</div>
                              <div style={{ fontSize: 10, color: t3 }}>{tareasActivas.length} active tasks · {horasOcupadas}h occupied</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: disponible ? '#34D39920' : '#F8717120', color: disponible ? '#34D399' : '#F87171', fontWeight: 700 }}>
                            {disponible ? '✓ Available' : '✕ Busy'}
                          </span>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t3, marginBottom: 5 }}>
                            <span>Weekly capacity (40h)</span>
                            <span style={{ color: disponible ? '#34D399' : '#F87171', fontWeight: 600 }}>{horasLibres}h available</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 4, background: disponible ? '#34D399' : '#F87171', width: `${pctOcupado}%`, transition: 'width .5s' }} />
                          </div>
                          <div style={{ fontSize: 9, color: t3, marginTop: 4, textAlign: 'right' }}>{Math.round(pctOcupado)}% capacity used</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: t3, marginBottom: 6, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Today's schedule (9am-6pm)</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {slots.map(hora => {
                              const slotOcupado = pctOcupado > 85 || (pctOcupado > 60 && (hora >= 10 && hora <= 14))
                              return (
                                <div key={hora} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: slotOcupado ? '#F8717115' : '#34D39915', color: slotOcupado ? '#F87171' : '#34D399', fontFamily: 'DM Mono', border: `1px solid ${slotOcupado ? '#F8717130' : '#34D39930'}` }}>
                                  {hora}:00
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        {tareasActivas.length > 0 && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}` }}>
                            <div style={{ fontSize: 10, color: t3, marginBottom: 6 }}>Tasks in progress:</div>
                            {tareasActivas.slice(0, 2).map(a => (
                              <div key={a.id} style={{ fontSize: 11, color: t2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: getColorMarca(a.area_ref), marginRight: 5 }}>●</span>{a.titulo}
                              </div>
                            ))}
                            {tareasActivas.length > 2 && <div style={{ fontSize: 10, color: t3 }}>+{tareasActivas.length - 2} more</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EQUIPO */}
        {mktTab === 'equipo' && (
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
              {[{ key: 'team', label: '👥 Team' }, { key: 'reporte', label: '💰 Report' }].map(t => (
                <button key={t.key} onClick={() => setSubVista(t.key)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: subVista === t.key ? t1 : t3, borderBottom: subVista === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
              ))}
            </div>
            {subVista !== 'reporte' ? (
              <Stratix360Roster
                usuarios={usuarios}
                actividades={actividades}
                colors={{ s1, border, accent, t1, t2, t3 }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {resumenHoras.map(r => (
                  <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                        <div style={{ fontSize: 10, color: t3 }}>{r.ref}</div>
                      </div>
                      <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#60A5FA' }}>{r.horas}h</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[{ label: 'Total', value: r.total, color: t1 }, { label: 'Completed', value: r.completadas, color: '#34D399' }, { label: 'Completion rate', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent }].map(s => (
                        <div key={s.label} style={{ background: s2, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 9, color: t3 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTE */}
        {mktTab === 'reporte' && (
          <div id="reporte-content">
            <div id="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #333' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#111' }}>Stratix Solutions</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#333' }}>Production Payment Report</div>
            </div>
            <div id="reporte-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Production payment report</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {esSuperAdmin && (
                  <select value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                    <option value="">Select</option>
                    {Object.entries(ACTIVE_MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
                  </select>
                )}
                <select value={mesReporte} onChange={e => setMesReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button onClick={() => {
                  const w = window.open('', '_blank', 'width=900,height=700')
                  if (!w) return
                  const estadoColor = (e: string) => ({ 'Completado': '#34D399', 'Por aprobar': '#FBB040', 'En proceso': '#7C6FF7', 'Pendiente': '#9494B3' }[e] || '#999')
                  const rows = actsRep.map((a: any, i: number) => `<tr>
                    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#666">${i + 1}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#111;font-weight:500">${a.titulo || ''}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555">${a.area_ref || ''}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.horas || 0}h</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;font-family:monospace;text-align:center">${a.dias_produccion || 0}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#555;text-align:center">${a.mes || ''}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center"><span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${estadoColor(a.estado)}20;color:${estadoColor(a.estado)};font-weight:600">${a.estado || ''}</span></td>
                  </tr>`).join('')
                  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                  w.document.write(`<!DOCTYPE html><html><head><title>Production Report — ${nombreRep}</title>
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
                      <div style="font-size:20px;font-weight:700">${nombreRep}</div>
                      <div style="font-size:11px;color:#888;font-family:monospace;margin-top:2px">${refRep}</div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Period</div>
                      <div style="font-size:16px;font-weight:700">${mesReporte} 2026</div>
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
                      <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${nombreRep}</div>
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
                }} style={{ padding: '7px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Print</button>
              </div>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Production Report</div>
                  <div style={{ fontSize: 12, color: t3 }}>Stratix 360 — Marketing Agency of Eminat Group</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: t3 }}>Period</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{mesReporte} 2026</div>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Team member</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t1 }}>{nombreRep}</div>
                <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{refRep}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                {[{ label: 'Total tasks', value: actsRep.length, color: accent }, { label: 'Completed', value: completadasRep, color: '#34D399' }, { label: 'Total hours', value: `${totalHorasRep}h`, color: '#F472B6' }, { label: 'Production days', value: totalDiasRep, color: '#60A5FA' }].map(s => (
                  <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: s2 }}>
                    {['Task', 'Area', 'Hours', 'Prod. Days', 'Status'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actsRep.map(a => (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: '8px 12px', color: t1 }}>{a.titulo}</td>
                      <td style={{ padding: '8px 12px', color: t3 }}>{a.area_ref}</td>
                      <td style={{ padding: '8px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.horas}h</td>
                      <td style={{ padding: '8px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.dias_produccion}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{a.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {actsRep.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>No tasks for this period</div>}
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
                <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Team member signature</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Coordinator signature</div></div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SOCIAL MEDIA DASHBOARD */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {mktTab === 'social' && (() => {
          const platforms = [
            { name: 'Instagram', icon: '📸', color: '#E1306C', accounts: [
              { handle: '@eminatmedicalcenter', brand: 'EMC', followers: 12840, followersChange: 342, posts: 28, reach: 48200, engagement: 4.2, impressions: 156000, stories: 45, reels: 12, bestPost: 'Reel — Skin treatments', bestReach: 18400 },
              { handle: '@soyvivintegrete', brand: 'SVN', followers: 45200, followersChange: 1205, posts: 35, reach: 125600, engagement: 5.8, impressions: 420000, stories: 62, reels: 18, bestPost: 'Reel — Wellness routine', bestReach: 52300 },
              { handle: '@eminatresearch', brand: 'ERG', followers: 3420, followersChange: 89, posts: 14, reach: 8900, engagement: 3.1, impressions: 28500, stories: 18, reels: 5, bestPost: 'Post — Clinical study results', bestReach: 4200 },
              { handle: '@premierbodysculpt', brand: 'PREMIER', followers: 8650, followersChange: 412, posts: 22, reach: 32100, engagement: 4.8, impressions: 98000, stories: 34, reels: 10, bestPost: 'Reel — Body transformation', bestReach: 14800 },
              { handle: '@ornella.ia', brand: 'ORNELLA', followers: 2180, followersChange: 680, posts: 18, reach: 15200, engagement: 6.2, impressions: 45000, stories: 22, reels: 8, bestPost: 'Reel — AI in healthcare', bestReach: 8900 },
            ]},
            { name: 'Facebook', icon: '👤', color: '#1877F2', accounts: [
              { handle: 'Eminat Medical Center', brand: 'EMC', followers: 8900, followersChange: 120, posts: 22, reach: 34500, engagement: 2.8, impressions: 89000, stories: 0, reels: 8, bestPost: 'Video — Center tour', bestReach: 12400 },
              { handle: 'Soy Vivi Negrete', brand: 'SVN', followers: 28400, followersChange: 580, posts: 30, reach: 78000, engagement: 3.4, impressions: 245000, stories: 0, reels: 14, bestPost: 'Live — Health Q&A', bestReach: 32100 },
              { handle: 'Premier by Eminat', brand: 'PREMIER', followers: 5200, followersChange: 185, posts: 16, reach: 18900, engagement: 3.1, impressions: 52000, stories: 0, reels: 6, bestPost: 'Video — Before and after', bestReach: 8700 },
            ]},
            { name: 'TikTok', icon: '🎵', color: '#010101', accounts: [
              { handle: '@soyvivintegrete', brand: 'SVN', followers: 18600, followersChange: 3200, posts: 24, reach: 285000, engagement: 8.4, impressions: 890000, stories: 0, reels: 24, bestPost: 'Nutrition tips', bestReach: 145000 },
              { handle: '@eminatmedical', brand: 'EMC', followers: 4200, followersChange: 890, posts: 16, reach: 62000, engagement: 6.1, impressions: 198000, stories: 0, reels: 16, bestPost: 'A day at the clinic', bestReach: 28000 },
              { handle: '@ornella.ia', brand: 'ORNELLA', followers: 1850, followersChange: 1200, posts: 20, reach: 95000, engagement: 9.2, impressions: 310000, stories: 0, reels: 20, bestPost: 'AI predicts your health', bestReach: 42000 },
            ]},
            { name: 'LinkedIn', icon: '💼', color: '#0A66C2', accounts: [
              { handle: 'Eminat Group', brand: 'EMC', followers: 2400, followersChange: 68, posts: 12, reach: 9800, engagement: 2.2, impressions: 24000, stories: 0, reels: 0, bestPost: 'Article — Healthcare innovation', bestReach: 3200 },
              { handle: 'Eminat Research Group', brand: 'ERG', followers: 1890, followersChange: 145, posts: 10, reach: 12400, engagement: 3.8, impressions: 31000, stories: 0, reels: 0, bestPost: 'Paper — Clinical trial results', bestReach: 5600 },
            ]},
            { name: 'YouTube', icon: '▶️', color: '#FF0000', accounts: [
              { handle: 'Soy Vivi Negrete', brand: 'SVN', followers: 6800, followersChange: 420, posts: 8, reach: 42000, engagement: 4.5, impressions: 128000, stories: 0, reels: 4, bestPost: 'Podcast — Holistic health', bestReach: 18500 },
              { handle: 'Eminat Medical', brand: 'EMC', followers: 1200, followersChange: 95, posts: 4, reach: 8400, engagement: 3.2, impressions: 22000, stories: 0, reels: 2, bestPost: 'Procedures explained', bestReach: 4800 },
            ]},
          ]

          const totalFollowers = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.followers, 0), 0)
          const totalGrowth = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.followersChange, 0), 0)
          const totalReach = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.reach, 0), 0)
          const totalPosts = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.posts, 0), 0)
          const avgEngagement = (() => { const all = platforms.flatMap(p => p.accounts); return all.length > 0 ? Math.round(all.reduce((a, ac) => a + ac.engagement, 0) / all.length * 10) / 10 : 0 })()

          const brandTotals = MARCAS_LIST.map(m => {
            const accs = platforms.flatMap(p => p.accounts.filter(a => a.brand === m.codigo))
            return { ...m, followers: accs.reduce((s, a) => s + a.followers, 0), growth: accs.reduce((s, a) => s + a.followersChange, 0), reach: accs.reduce((s, a) => s + a.reach, 0), engagement: accs.length > 0 ? Math.round(accs.reduce((s, a) => s + a.engagement, 0) / accs.length * 10) / 10 : 0, posts: accs.reduce((s, a) => s + a.posts, 0) }
          }).filter(b => b.followers > 0).sort((a, b) => b.followers - a.followers)

          const fNum = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)
          const cardS: React.CSSProperties = { background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
          const statS: React.CSSProperties = { ...cardS, display: 'flex', flexDirection: 'column', gap: 4 }
          const badge = (color: string): React.CSSProperties => ({ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color, fontWeight: 600, whiteSpace: 'nowrap' as const })

          return (
            <div>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                <div style={statS}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Followers</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: accent }}>{fNum(totalFollowers)}</div>
                  <div style={{ fontSize: 10, color: '#34D399' }}>+{fNum(totalGrowth)} this month</div>
                </div>
                <div style={statS}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Reach</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: '#60A5FA' }}>{fNum(totalReach)}</div>
                  <div style={{ fontSize: 10, color: t3 }}>people reached</div>
                </div>
                <div style={statS}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Avg Engagement</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: '#34D399' }}>{avgEngagement}%</div>
                  <div style={{ fontSize: 10, color: t3 }}>average interaction</div>
                </div>
                <div style={statS}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Posts This Month</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: '#F472B6' }}>{totalPosts}</div>
                  <div style={{ fontSize: 10, color: t3 }}>publications</div>
                </div>
                <div style={statS}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Growth</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: '#FBB040' }}>+{Math.round(totalGrowth / Math.max(totalFollowers - totalGrowth, 1) * 100 * 10) / 10}%</div>
                  <div style={{ fontSize: 10, color: t3 }}>current month</div>
                </div>
              </div>

              {/* Brand Performance */}
              <div style={{ ...cardS, marginBottom: 16 }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Performance by Brand</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(brandTotals.length, 5)}, 1fr)`, gap: 12 }}>
                  {brandTotals.map(b => (
                    <div key={b.codigo} style={{ padding: '14px', borderRadius: 12, border: `1px solid ${border}`, background: `${b.color}08` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: b.color }}>{b.codigo}</span>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', color: t1 }}>{fNum(b.followers)}</div>
                      <div style={{ fontSize: 10, color: '#34D399', marginTop: 2 }}>+{fNum(b.growth)} · {b.engagement}% eng</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <div style={{ fontSize: 10, color: t3 }}><span style={{ fontWeight: 600, color: t2 }}>{fNum(b.reach)}</span> reach</div>
                        <div style={{ fontSize: 10, color: t3 }}><span style={{ fontWeight: 600, color: t2 }}>{b.posts}</span> posts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Details */}
              {platforms.map(platform => (
                <div key={platform.name} style={{ ...cardS, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>{platform.icon}</span>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1 }}>{platform.name}</span>
                    <span style={badge(platform.color)}>{platform.accounts.length} accounts</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: t3 }}>Total: <span style={{ fontWeight: 700, color: t1 }}>{fNum(platform.accounts.reduce((s, a) => s + a.followers, 0))}</span> followers</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}` }}>
                        {['Account', 'Brand', 'Followers', 'Growth', 'Posts', 'Reach', 'Engagement', 'Impressions', 'Best Post'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {platform.accounts.map(acc => (
                        <tr key={acc.handle} style={{ borderBottom: `1px solid ${border}` }}>
                          <td style={{ padding: '10px', color: t1, fontWeight: 500 }}>{acc.handle}</td>
                          <td style={{ padding: '10px' }}><span style={badge(getColorMarca(acc.brand))}>{acc.brand}</span></td>
                          <td style={{ padding: '10px', fontWeight: 700, color: t1, fontFamily: 'DM Mono' }}>{fNum(acc.followers)}</td>
                          <td style={{ padding: '10px', color: '#34D399', fontFamily: 'DM Mono' }}>+{fNum(acc.followersChange)}</td>
                          <td style={{ padding: '10px', color: t2, fontFamily: 'DM Mono' }}>{acc.posts}</td>
                          <td style={{ padding: '10px', color: t2, fontFamily: 'DM Mono' }}>{fNum(acc.reach)}</td>
                          <td style={{ padding: '10px' }}><span style={badge(acc.engagement >= 5 ? '#34D399' : acc.engagement >= 3 ? '#FBB040' : '#F87171')}>{acc.engagement}%</span></td>
                          <td style={{ padding: '10px', color: t3, fontFamily: 'DM Mono' }}>{fNum(acc.impressions)}</td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ fontSize: 11, color: t2 }}>{acc.bestPost}</div>
                            <div style={{ fontSize: 9, color: t3 }}>{fNum(acc.bestReach)} reach</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Content Calendar Summary */}
              <div style={cardS}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Monthly Content Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Reels / Videos', value: platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.reels, 0), 0), icon: '🎬', color: '#E1306C' },
                    { label: 'Stories', value: platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.stories, 0), 0), icon: '📱', color: '#FBB040' },
                    { label: 'Static Posts', value: totalPosts - platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.reels, 0), 0), icon: '🖼️', color: '#60A5FA' },
                    { label: 'Total Pieces', value: totalPosts + platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.stories, 0), 0), icon: '📊', color: accent },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${border}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* COMPETENCIA MIAMI DASHBOARD */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {mktTab === 'competencia' && (() => {
          const competitors = [
            {
              name: 'Miami Dade Medical Group',
              tipo: 'Medical Center',
              ubicacion: 'Doral, FL',
              website: 'miamidademedical.com',
              instagram: '@miamidademedical',
              igFollowers: 22400,
              igEngagement: 3.2,
              facebook: 'Miami Dade Medical',
              fbFollowers: 15800,
              tiktok: '@miamidademedical',
              tkFollowers: 8900,
              fortalezas: ['High patient volume', 'Strategic location in Doral', 'Bilingual service'],
              debilidades: ['Generic branding', 'Undifferentiated content', 'No research program'],
              servicios: ['General Medicine', 'Emergency', 'Laboratory', 'Radiology'],
              precioRango: '$$',
              googleRating: 4.2,
              googleReviews: 342,
              tendencia: 'estable' as const,
            },
            {
              name: 'Brickell Aesthetics Center',
              tipo: 'Aesthetics & Wellness',
              ubicacion: 'Brickell, FL',
              website: 'brickellaesthetics.com',
              instagram: '@brickellaesthetics',
              igFollowers: 38200,
              igEngagement: 5.1,
              facebook: 'Brickell Aesthetics',
              fbFollowers: 12400,
              tiktok: '@brickellaesthetics',
              tkFollowers: 15600,
              fortalezas: ['Strong social media presence', 'High-quality content', 'Influencer partnerships'],
              debilidades: ['High prices', 'Aesthetics only — no medical services', 'Very niche focus'],
              servicios: ['Body Sculpting', 'Facial Treatments', 'IV Therapy', 'Botox/Fillers'],
              precioRango: '$$$',
              googleRating: 4.6,
              googleReviews: 189,
              tendencia: 'creciendo' as const,
            },
            {
              name: 'South Florida Health Hub',
              tipo: 'Multi-specialty',
              ubicacion: 'Kendall, FL',
              website: 'sfhealthhub.com',
              instagram: '@sfhealthhub',
              igFollowers: 9800,
              igEngagement: 2.4,
              facebook: 'South Florida Health Hub',
              fbFollowers: 21000,
              tiktok: '',
              tkFollowers: 0,
              fortalezas: ['Large physician network', 'Multiple insurance plans', 'Modern facilities'],
              debilidades: ['Weak social media', 'No TikTok', 'Corporate branding with no personality'],
              servicios: ['General Medicine', 'Cardiology', 'Dermatology', 'Orthopedics'],
              precioRango: '$$',
              googleRating: 3.9,
              googleReviews: 567,
              tendencia: 'bajando' as const,
            },
            {
              name: 'Coral Gables Wellness Institute',
              tipo: 'Wellness & Research',
              ubicacion: 'Coral Gables, FL',
              website: 'cgwellness.com',
              instagram: '@cgwellnessinstitute',
              igFollowers: 14500,
              igEngagement: 4.3,
              facebook: 'CG Wellness Institute',
              fbFollowers: 8900,
              tiktok: '@cgwellness',
              tkFollowers: 5200,
              fortalezas: ['Holistic wellness focus', 'Clinical trials', 'High medical trust'],
              debilidades: ['Exclusive premium pricing', 'Conservative marketing', 'Slow social media growth'],
              servicios: ['Clinical Research', 'Functional Medicine', 'Nutrition', 'Mental Health'],
              precioRango: '$$$',
              googleRating: 4.7,
              googleReviews: 124,
              tendencia: 'creciendo' as const,
            },
            {
              name: 'LatinCare Medical Centers',
              tipo: 'Medical Center',
              ubicacion: 'Hialeah, FL',
              website: 'latincare.com',
              instagram: '@latincaremedical',
              igFollowers: 16700,
              igEngagement: 3.8,
              facebook: 'LatinCare Medical',
              fbFollowers: 28900,
              tiktok: '@latincaremedical',
              tkFollowers: 12300,
              fortalezas: ['Strong Hispanic community', 'Affordable prices', 'High Facebook volume'],
              debilidades: ['Single-segment dependency', 'Repetitive content', 'No LinkedIn presence'],
              servicios: ['Family Medicine', 'Pediatrics', 'Gynecology', 'Laboratory'],
              precioRango: '$',
              googleRating: 4.0,
              googleReviews: 892,
              tendencia: 'estable' as const,
            },
          ]

          // Eminat data for comparison
          const eminatData = {
            igFollowers: 12840 + 45200 + 3420 + 8650 + 2180,
            fbFollowers: 8900 + 28400 + 5200,
            tkFollowers: 18600 + 4200 + 1850,
            avgEngagement: 4.8,
            googleRating: 4.8,
            googleReviews: 234,
          }

          const tendenciaColors: Record<string, string> = { creciendo: '#34D399', estable: '#FBB040', bajando: '#F87171' }
          const tendenciaIcons: Record<string, string> = { creciendo: '📈', estable: '➡️', bajando: '📉' }
          const fNum = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)
          const cardS: React.CSSProperties = { background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
          const badge = (color: string): React.CSSProperties => ({ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color, fontWeight: 600, whiteSpace: 'nowrap' as const })

          const maxIG = Math.max(eminatData.igFollowers, ...competitors.map(c => c.igFollowers))

          return (
            <div>
              {/* Market Position Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <div style={{ ...cardS, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Instagram Position</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: '#34D399' }}>#1</div>
                  <div style={{ fontSize: 10, color: t3 }}>Eminat: {fNum(eminatData.igFollowers)} vs top comp: {fNum(Math.max(...competitors.map(c => c.igFollowers)))}</div>
                </div>
                <div style={{ ...cardS, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Google Rating</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: '#FBB040' }}>{'⭐'.repeat(Math.round(eminatData.googleRating))}</div>
                  <div style={{ fontSize: 10, color: t3 }}>{eminatData.googleRating}/5 — {eminatData.googleReviews} reviews</div>
                </div>
                <div style={{ ...cardS, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Engagement vs Market</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: accent }}>{eminatData.avgEngagement}%</div>
                  <div style={{ fontSize: 10, color: '#34D399' }}>+{(eminatData.avgEngagement - Math.round(competitors.reduce((s, c) => s + c.igEngagement, 0) / competitors.length * 10) / 10).toFixed(1)}% above average</div>
                </div>
                <div style={{ ...cardS, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Competitors Tracked</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: t1 }}>{competitors.length}</div>
                  <div style={{ fontSize: 10, color: t3 }}>{competitors.filter(c => c.tendencia === 'creciendo').length} growing · {competitors.filter(c => c.tendencia === 'bajando').length} declining</div>
                </div>
              </div>

              {/* Instagram Comparison Bar Chart */}
              <div style={{ ...cardS, marginBottom: 16 }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 16 }}>Instagram Comparison — Miami Followers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Eminat */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 180, fontSize: 12, fontWeight: 700, color: accent, textAlign: 'right' }}>Eminat (all brands)</div>
                    <div style={{ flex: 1, height: 28, borderRadius: 6, background: s2 }}>
                      <div style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${accent}, #A78BFA)`, width: `${(eminatData.igFollowers / maxIG) * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, transition: 'width .5s' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{fNum(eminatData.igFollowers)}</span>
                      </div>
                    </div>
                  </div>
                  {competitors.sort((a, b) => b.igFollowers - a.igFollowers).map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 180, fontSize: 11, color: t2, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ flex: 1, height: 22, borderRadius: 6, background: s2 }}>
                        <div style={{ height: '100%', borderRadius: 6, background: tendenciaColors[c.tendencia], opacity: 0.6, width: `${(c.igFollowers / maxIG) * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, transition: 'width .5s' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'white' }}>{fNum(c.igFollowers)}</span>
                        </div>
                      </div>
                      <span style={badge(tendenciaColors[c.tendencia])}>{tendenciaIcons[c.tendencia]} {c.tendencia}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competitor Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {competitors.map(comp => (
                  <div key={comp.name} style={{ ...cardS, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 14, right: 14 }}>
                      <span style={badge(tendenciaColors[comp.tendencia])}>{tendenciaIcons[comp.tendencia]} {comp.tendencia}</span>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: t1, marginBottom: 2 }}>{comp.name}</div>
                      <div style={{ fontSize: 11, color: t3 }}>{comp.tipo} · {comp.ubicacion}</div>
                      <div style={{ fontSize: 10, color: accent, fontFamily: 'DM Mono', marginTop: 2 }}>{comp.website}</div>
                    </div>

                    {/* Social Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                      <div style={{ padding: '8px', borderRadius: 8, background: s2, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: t3, marginBottom: 2 }}>📸 Instagram</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{fNum(comp.igFollowers)}</div>
                        <div style={{ fontSize: 9, color: '#34D399' }}>{comp.igEngagement}% eng</div>
                      </div>
                      <div style={{ padding: '8px', borderRadius: 8, background: s2, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: t3, marginBottom: 2 }}>👤 Facebook</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{fNum(comp.fbFollowers)}</div>
                      </div>
                      <div style={{ padding: '8px', borderRadius: 8, background: s2, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: t3, marginBottom: 2 }}>🎵 TikTok</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{comp.tkFollowers > 0 ? fNum(comp.tkFollowers) : '—'}</div>
                      </div>
                    </div>

                    {/* Google Rating */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '6px 10px', borderRadius: 8, background: s2 }}>
                      <span style={{ fontSize: 11 }}>⭐</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: comp.googleRating >= 4.5 ? '#34D399' : comp.googleRating >= 4 ? '#FBB040' : '#F87171' }}>{comp.googleRating}</span>
                      <span style={{ fontSize: 10, color: t3 }}>({comp.googleReviews} reviews)</span>
                      <span style={{ fontSize: 10, color: t3 }}>· {comp.precioRango}</span>
                    </div>

                    {/* Services */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Services</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {comp.servicios.map(s => <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: s2, color: t2 }}>{s}</span>)}
                      </div>
                    </div>

                    {/* Strengths and Weaknesses */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#34D399', fontWeight: 600, marginBottom: 4 }}>Strengths</div>
                        {comp.fortalezas.map(f => <div key={f} style={{ fontSize: 10, color: t2, padding: '2px 0', display: 'flex', gap: 4 }}><span style={{ color: '#34D399' }}>+</span> {f}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#F87171', fontWeight: 600, marginBottom: 4 }}>Weaknesses</div>
                        {comp.debilidades.map(d => <div key={d} style={{ fontSize: 10, color: t2, padding: '2px 0', display: 'flex', gap: 4 }}><span style={{ color: '#F87171' }}>-</span> {d}</div>)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Eminat Advantages Card */}
                <div style={{ ...cardS, border: `2px solid ${accent}`, background: `${accent}05` }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: accent, marginBottom: 12 }}>Eminat Competitive Advantages</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: '🏥', title: 'Integrated Ecosystem', desc: 'Medical Center + Research Group + Foundation — no one else offers this' },
                      { icon: '📸', title: 'Social Media Leader', desc: `${fNum(eminatData.igFollowers)} combined IG followers, ${eminatData.avgEngagement}% engagement` },
                      { icon: '🔬', title: 'Clinical Research', desc: 'Only one with an active clinical research program in the segment' },
                      { icon: '🤖', title: 'AI & Technology', desc: 'Ornella AI as a technology differentiator in the market' },
                      { icon: '🌎', title: 'Multi-brand', desc: '5+ brands covering medical, aesthetics, research, wellness and social' },
                      { icon: '⭐', title: 'Superior Reputation', desc: `${eminatData.googleRating}/5 Google Rating — above market average` },
                      { icon: '❤️', title: 'Social Impact', desc: 'VN Foundation — unique social responsibility differentiator' },
                    ].map(v => (
                      <div key={v.title} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 10, background: `${accent}08` }}>
                        <span style={{ fontSize: 20 }}>{v.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{v.title}</div>
                          <div style={{ fontSize: 10, color: t2 }}>{v.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* VIEW TASK MODAL */}
      {modalVerAct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalVerAct(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${getColorMarca(modalVerAct.area_ref)}25`, color: getColorMarca(modalVerAct.area_ref), fontWeight: 600 }}>{modalVerAct.area_ref}</span>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${ESTADO_COLORS[modalVerAct.estado] || t3}20`, color: ESTADO_COLORS[modalVerAct.estado] || t3 }}>{modalVerAct.estado}</span>
                </div>
                <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1, lineHeight: 1.3 }}>{modalVerAct.titulo}</div>
              </div>
              <button onClick={() => setModalVerAct(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 22, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>✕</button>
            </div>
            {modalVerAct.descripcion && (
              <div style={{ marginBottom: 16, padding: '12px', background: s2, borderRadius: 10, fontSize: 13, color: t2, lineHeight: 1.5 }}>{modalVerAct.descripcion}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Assignee', value: MIEMBROS_REFS[modalVerAct.responsable_ref] || modalVerAct.responsable_ref },
                { label: 'Requested by', value: SOLICITANTES.find(s => s.value === modalVerAct.solicitado_por)?.label || modalVerAct.solicitado_por || '—' },
                { label: 'Month', value: modalVerAct.mes },
                { label: 'Quarter', value: modalVerAct.trimestre || mesATrimestre[modalVerAct.mes || 'Enero'] || 'Q1' },
                { label: 'Estimated hours', value: `${modalVerAct.horas || 0}h` },
                { label: 'Production days', value: modalVerAct.dias_produccion || '0' },
                { label: 'Due date', value: modalVerAct.fecha_entrega ? new Date(modalVerAct.fecha_entrega + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' }) : 'No date' },
                { label: 'Verified', value: modalVerAct.verificado ? '✓ Yes' : '✕ No' },
              ].map(item => (
                <div key={item.label} style={{ background: s2, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 2, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: t3, marginBottom: 8, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>Change status</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLUMNAS_KANBAN.map(col => (
                  <button key={col} onClick={async () => {
                    await supabase.from('actividades').update({ estado: col }).eq('id', modalVerAct.id)
                    setActividades(prev => prev.map(a => a.id === modalVerAct.id ? { ...a, estado: col } : a))
                    setModalVerAct((p: any) => ({ ...p, estado: col }))
                    mostrarMensaje('ok', `Status → "${col}"`)
                  }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `2px solid ${modalVerAct.estado === col ? ESTADO_COLORS[col] : border}`, background: modalVerAct.estado === col ? `${ESTADO_COLORS[col]}20` : 'transparent', color: modalVerAct.estado === col ? ESTADO_COLORS[col] : t2, cursor: 'pointer', fontWeight: modalVerAct.estado === col ? 700 : 400 }}>{col}</button>
                ))}
              </div>
            </div>
            {modalVerAct.drive_url && (
              <a href={modalVerAct.drive_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: `${accent}15`, color: accent, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                🔗 View folder in Google Drive
              </a>
            )}
          </div>
        </div>
      )}

      {/* NEW TASK MODAL */}
      {modalNuevaAct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>New task</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Fill in the fields to add to Kanban</div>
              </div>
              <button onClick={() => setModalNuevaAct(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Task title <span style={{ color: '#F87171' }}>*</span></label>
              <input type="text" value={nuevaAct.titulo} onChange={e => setNuevaAct(p => ({ ...p, titulo: e.target.value }))} placeholder="E.g. Design banner for EMC social media" autoFocus style={{ ...inputStyle, fontSize: 14, padding: '11px 14px' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Description (optional)</label>
              <textarea value={nuevaAct.descripcion} onChange={e => setNuevaAct(p => ({ ...p, descripcion: e.target.value }))} placeholder="Describe what this task includes..." rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🎨 Brand / Area <span style={{ color: '#F87171' }}>*</span></label>
                <select value={nuevaAct.area_ref} onChange={e => setNuevaAct(p => ({ ...p, area_ref: e.target.value }))} style={inputStyle}>
                  {MARCAS_LIST.map(a => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>👤 Assignee <span style={{ color: '#F87171' }}>*</span></label>
                <select value={nuevaAct.responsable_ref} onChange={e => setNuevaAct(p => ({ ...p, responsable_ref: e.target.value }))} style={inputStyle}>
                  {Object.entries(ACTIVE_MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📨 Requested by</label>
              <select value={nuevaAct.solicitado_por} onChange={e => setNuevaAct(p => ({ ...p, solicitado_por: e.target.value }))} style={inputStyle}>
                {SOLICITANTES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📅 Month</label>
                <select value={nuevaAct.mes} onChange={e => setNuevaAct(p => ({ ...p, mes: e.target.value }))} style={inputStyle}>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⏱ Estimated hours</label>
                <input type="number" value={nuevaAct.horas} onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📆 Prod. days</label>
                <input type="number" value={nuevaAct.dias_produccion} onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⚡ Initial status</label>
                <select value={nuevaAct.estado} onChange={e => setNuevaAct(p => ({ ...p, estado: e.target.value }))} style={inputStyle}>
                  {COLUMNAS_KANBAN.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🗓 Due date</label>
                <input type="date" value={nuevaAct.fecha_entrega} onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🔗 Google Drive link (optional)</label>
              <input type="url" value={nuevaAct.drive_url} onChange={e => setNuevaAct(p => ({ ...p, drive_url: e.target.value }))} placeholder="https://drive.google.com/drive/folders/..." style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalNuevaAct(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={crearActividad} disabled={creandoAct || !nuevaAct.titulo.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: creandoAct || !nuevaAct.titulo.trim() ? t3 : accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: creandoAct || !nuevaAct.titulo.trim() ? 'not-allowed' : 'pointer' }}>
                {creandoAct ? '⏳ Creating...' : '✓ Create task'}
              </button>
            </div>
          </div>
        </div>
      )}
      </PageTransition>
    </AppShell>
  )
}

// ── Stratix 360 roster ────────────────────────────────────────────────────
// The roster (org chart display) is now driven by STRATIX360_ROSTER below,
// NOT by the contents of the `usuarios` Supabase table. Each entry is rendered
// regardless of whether the person has an account yet; we *enrich* with
// usuarios data (avatar color, online status, real email) when a row exists,
// and show a "Cuenta por crear" placeholder when one doesn't.
//
// Why this matters:
//   - Tasha Palomino and Angie Núñez are team members but their accounts
//     are still pending. With the previous (usuarios-driven) approach they
//     never appeared in Equipo. Now they always do.
//   - Javier Andrade and Jonathan Bula are NOT in this array, so they can
//     never appear here even if their usuarios rows somehow leak through.
//     The module-scope isExcludedFromStratix360() helper is an additional
//     safety net for any code path that still reads from usuarios/equipo.

type RosterColors = {
  s1: string
  border: string
  accent: string
  t1: string
  t2: string
  t3: string
}

type AreaKey = 'director' | 'diseno' | 'edicion' | 'automatizacion' | 'cuentas'

type RosterEntry = {
  nombre: string
  area: AreaKey
  leader: boolean
  titulo: string
}

const AREA_META: Record<Exclude<AreaKey, 'director'>, { label: string; icon: string; color: string }> = {
  diseno: { label: 'Diseño', icon: '🎨', color: '#F472B6' },
  edicion: { label: 'Edición', icon: '🎬', color: '#7C6FF7' },
  automatizacion: { label: 'Automatización · Data & Insight', icon: '⚙️', color: '#A78BFA' },
  cuentas: { label: 'Cuentas / CM', icon: '📲', color: '#60A5FA' },
}

const STRATIX360_ROSTER: RosterEntry[] = [
  { nombre: 'Freddy Crespín',  area: 'director',       leader: true,  titulo: 'Director de Marketing' },
  { nombre: 'Joselyne Guerrero', area: 'diseno',       leader: true,  titulo: 'Lead Designer' },
  { nombre: 'Arianna Sig-Tú',    area: 'diseno',       leader: false, titulo: 'Graphic Designer' },
  { nombre: 'Angie Núñez',       area: 'diseno',       leader: false, titulo: 'Graphic Designer' },
  { nombre: 'David Falconi',     area: 'edicion',      leader: true,  titulo: 'Lead Editor & Animations' },
  { nombre: 'Bryan Núñez',       area: 'edicion',      leader: false, titulo: 'Video Editor' },
  { nombre: 'Tasha Palomino',    area: 'edicion',      leader: false, titulo: 'Video Editor' },
  { nombre: 'Wagner Dueñas',     area: 'automatizacion', leader: true, titulo: 'Full Stack Developer' },
  { nombre: 'Naomi Panchana',    area: 'cuentas',      leader: true,  titulo: 'Ejecutiva de Cuentas & CM' },
]

function Stratix360Roster({
  usuarios,
  actividades,
  colors,
}: {
  usuarios: any[]
  actividades: any[]
  colors: RosterColors
}) {
  const { s1, border, accent, t1, t2, t3 } = colors

  // Build a name→user index from usuarios, filtering OUT any excluded person
  // up front so a Javier/Jonathan row in the table cannot enrich an entry.
  const userByName = new Map<string, any>()
  for (const u of usuarios) {
    if (isExcludedFromStratix360(u)) continue
    const key = normTeamName(`${u.nombre || ''} ${u.apellido || ''}`)
    if (key) userByName.set(key, u)
  }

  const enriched = STRATIX360_ROSTER.map((entry) => ({
    entry,
    user: userByName.get(normTeamName(entry.nombre)) ?? null,
  }))

  const director = enriched.find((e) => e.entry.area === 'director')
  const groups = (['diseno', 'edicion', 'automatizacion', 'cuentas'] as const).map((area) => ({
    area,
    meta: AREA_META[area],
    members: enriched
      .filter((e) => e.entry.area === area)
      .sort((a, b) => (a.entry.leader === b.entry.leader ? 0 : a.entry.leader ? -1 : 1)),
  }))

  const renderCard = (
    entry: RosterEntry,
    user: any | null,
    accentOverride?: string,
  ) => {
    const isLeader = entry.leader
    const initials = entry.nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
    const isOnline = user?.online_at
      ? new Date(user.online_at) > new Date(Date.now() - 5 * 60 * 1000)
      : false
    const tareasHoy = user
      ? actividades.filter(
          (a) => a.responsable_ref === user.responsable_ref && a.estado === 'En proceso',
        ).length
      : 0
    const swatch = user?.color || accentOverride || accent
    return (
      <div
        key={entry.nombre}
        style={{
          background: s1,
          border: `1px solid ${isLeader ? `${accentOverride || accent}55` : border}`,
          borderRadius: 14,
          padding: 16,
          boxShadow: isLeader
            ? `0 2px 8px ${accentOverride || accent}20`
            : '0 1px 3px rgba(0,0,0,0.06)',
          position: 'relative',
          opacity: user ? 1 : 0.92,
        }}
      >
        {isLeader && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '.1em',
              padding: '2px 8px',
              borderRadius: 10,
              background: accentOverride || accent,
              color: 'white',
            }}
          >
            LÍDER
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: swatch,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {initials}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: user ? (isOnline ? '#34D399' : '#555') : '#9CA3AF',
                border: `2px solid ${s1}`,
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{entry.nombre}</div>
            <div style={{ fontSize: 11, color: t2, marginTop: 1 }}>{entry.titulo}</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            color: t3,
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user ? `✉ ${user.email}` : '✉ — sin cuenta todavía'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {user ? (
            <span style={{ fontSize: 10, color: isOnline ? '#34D399' : t3 }}>
              {isOnline ? '● Active now' : 'Offline'}
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#FBB040',
                background: '#FBB04015',
                padding: '2px 8px',
                borderRadius: 10,
              }}
            >
              Cuenta por crear
            </span>
          )}
          {user && tareasHoy > 0 && (
            <span
              style={{
                fontSize: 10,
                color: '#FBB040',
                background: '#FBB04015',
                padding: '2px 8px',
                borderRadius: 10,
              }}
            >
              {tareasHoy} in progress
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Director de Marketing */}
      {director && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: accent,
              marginBottom: 12,
              padding: '4px 12px',
              background: `${accent}15`,
              borderRadius: 20,
              display: 'inline-block',
            }}
          >
            Director de Marketing — sobre todas las áreas
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {renderCard(director.entry, director.user)}
          </div>
        </div>
      )}

      {/* Áreas */}
      {groups.map(({ area, meta, members }) => {
        if (!members.length) return null
        return (
          <div key={area} style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: meta.color,
                marginBottom: 12,
                padding: '4px 12px',
                background: `${meta.color}15`,
                borderRadius: 20,
                display: 'inline-block',
              }}
            >
              {meta.icon} {meta.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {members.map(({ entry, user }) => renderCard(entry, user, meta.color))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

