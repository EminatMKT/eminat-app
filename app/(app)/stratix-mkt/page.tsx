'use client'

import { useState } from 'react'
import { useApp, MESES, MESES_Q, TRIMESTRES, mesATrimestre, MARCAS_LIST, ESTADO_COLORS, COLUMNAS_KANBAN, MIEMBROS_REFS, SOLICITANTES, getColorMarca } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function StratixMktPage() {
  const {
    usuario, actividades, equipo, usuarios, dark,
    esSuperAdmin, mostrarMensaje, setActividades,
    s1, s2, s3, border, t1, t2, t3, accent, inputStyle, onlineCount,
  } = useApp()

  const [mktTab, setMktTab] = useState('kanban')
  const [trimestre, setTrimestre] = useState('General')
  const [mesKanban, setMesKanban] = useState('')
  const [ganttVista, setGanttVista] = useState('Mes')
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
  const [filtroEstadoSol, setFiltroEstadoSol] = useState('Todos')
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
  const equipoSinMi = equipo.filter(u => u.nombre !== usuario?.nombre && u.email?.toLowerCase() !== 'javier@emc.health')
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
  const refsTeam = esSuperAdmin ? Object.keys(MIEMBROS_REFS) : [usuario?.responsable_ref].filter(Boolean)
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
      mostrarMensaje('ok', `Movido a "${col}"`)
    }
    setDragId(null)
    setDragOver(null)
  }

  async function crearActividad() {
    if (!nuevaAct.titulo.trim()) { mostrarMensaje('error', 'El titulo es obligatorio'); return }
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
          await supabase.from('notificaciones').insert({ usuario_id: responsableUser.id, tipo: 'tarea_asignada', titulo: 'Nueva tarea asignada', mensaje: `"${nuevaAct.titulo}" — ${nuevaAct.area_ref} · ${nuevaAct.mes}`, actividad_id: data.id, leida: false })
        }
      }

      setModalNuevaAct(false)
      setNuevaAct({ titulo: '', descripcion: '', area_ref: 'EMC', responsable_ref: 'DG_Joselyn', mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '', estado: 'Pendiente', fecha_entrega: '', solicitado_por: 'Coord_MFreddy', drive_url: '' })
      mostrarMensaje('ok', 'Tarea creada exitosamente')
    } catch (e) {
      mostrarMensaje('error', 'Error inesperado al crear la tarea')
    }
    setCreandoAct(false)
  }

  const getGanttActs = () => {
    const mesesGantt: Record<string, string[]> = { Q1: ['Enero','Febrero','Marzo'], Q2: ['Abril','Mayo','Junio'], Q3: ['Julio','Agosto','Septiembre'], Q4: ['Octubre','Noviembre','Diciembre'] }
    let acts = actividades.filter(a => a.fecha_entrega)
    if (mesesGantt[ganttVista]) acts = acts.filter(a => mesesGantt[ganttVista].includes(a.mes))
    else if (ganttVista === 'Semana') {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - hoy.getDay())
      const fin = new Date(ini); fin.setDate(ini.getDate() + 6)
      acts = acts.filter(a => { const f = new Date(a.fecha_entrega); return f >= ini && f <= fin })
    } else if (ganttVista === 'Mes') {
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
          <span style={{ fontSize: 16 }}>+</span> Nueva tarea
        </button>
      ) : undefined}
    >
      <div>
        {/* MKT TABS */}
        {(mktTab === 'overview' || mktTab === 'kanban' || mktTab === 'gantt' || mktTab === 'horas') && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
            {[{ key: 'overview', label: '📊 Overview' }, { key: 'kanban', label: '⚡ Kanban' }, { key: 'gantt', label: '📊 Gantt' }, { key: 'horas', label: '⏱ Horas' }].map(t => (
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Total Tareas', value: totalQ, color: accent, sub: 'actividades' },
                { label: 'Completadas', value: completadasQ, color: '#34D399', sub: `${pctCompletado}% efectividad` },
                { label: 'En Proceso', value: enProcesoQ, color: '#FBB040', sub: 'en curso' },
                { label: 'Pendientes', value: pendientesQ, color: '#9494B3', sub: 'sin iniciar' },
                { label: 'Horas Totales', value: `${totalHoras}h`, color: '#F472B6', sub: `${totalDias} dias prod.` },
                { label: 'Horas Libres', value: `${horasDisponibles}h`, color: '#60A5FA', sub: `${diasRestantes} dias restantes` },
              ].map(k => (
                <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontFamily: 'DM Mono' }}>{k.label}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, lineHeight: 1, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>{k.sub}</div>
                  <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: border }}>
                    <div style={{ height: 2, borderRadius: 1, background: k.color, width: `${pctCompletado}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 270px', gap: 12, marginBottom: 14 }}>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Produccion por mes — {trimestre}</div>
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
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 12 }}>Por marca — {trimestre}</div>
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
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Marketing Today</div>
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
                          <div style={{ fontSize: 9, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Activo ahora' : 'Offline'}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 12 }}>
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Actividades recientes</div>
                  <button onClick={() => setMktTab('solicitudes')} style={{ fontSize: 10, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>Ver todas →</button>
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
              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14 }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Ranking del equipo</div>
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
              <div style={{ fontSize: 12, color: t3 }}>{actsKanban.length} tareas · Arrastra las tarjetas para cambiar su estado</div>
              <select value={mesKanban} onChange={e => setMesKanban(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                <option value="">Todos los meses</option>
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
                              {a.fecha_entrega && <span style={{ fontSize: 9, color: new Date(a.fecha_entrega) < new Date() && a.estado !== 'Completado' ? '#F87171' : t3 }}>📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}</span>}
                              {a.drive_url && <span style={{ fontSize: 9, color: '#60A5FA' }}>🔗</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {col === 'Pendiente' && (
                      <button onClick={() => { setNuevaAct(p => ({ ...p, estado: 'Pendiente' })); setModalNuevaAct(true) }}
                        style={{ padding: '8px', borderRadius: 10, border: `1px dashed ${border}`, background: 'transparent', color: t3, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>+</span> Agregar tarea
                      </button>
                    )}
                    {porColumna(col).length === 0 && col !== 'Pendiente' && (
                      <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: '20px', textAlign: 'center', color: t3, fontSize: 11 }}>Arrastra aqui</div>
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
                <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Diagrama de Gantt</span>
                <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>Vista por fechas de entrega</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Semana', 'Mes', 'Q1', 'Q2', 'Q3', 'Q4'].map(v => (
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
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
                    <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderRight: `1px solid ${border}` }}>Tarea / Responsable</div>
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
                    {actsGantt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin tareas con fecha de entrega para esta vista</div>}
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
                      Fin de semana
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
              <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>{esSuperAdmin ? 'Resumen del equipo' : 'Tus horas'}</span>
              <select value={mesHoras} onChange={e => setMesHoras(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                <option value="">Todos los meses</option>
                {MESES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {resumenHoras.map(r => (
                <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                      <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{r.ref}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 30, fontWeight: 800, color: '#60A5FA', lineHeight: 1 }}>{r.horas}h</div>
                      <div style={{ fontSize: 10, color: t3 }}>{r.dias} dias de produccion</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                    {[{ label: 'Total tareas', value: r.total, color: t1 }, { label: 'Completadas', value: r.completadas, color: '#34D399' }, { label: 'Efectividad', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent }].map(s => (
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
              {[{ key: 'lista', label: '📋 Lista de tareas' }, { key: 'disponibilidad', label: '🗓 Disponibilidad' }].map(t => (
                <button key={t.key} onClick={() => setSolTab(t.key)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: solTab === t.key ? t1 : t3, borderBottom: solTab === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
              ))}
            </div>

            {solTab === 'lista' && (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="text" placeholder="Buscar por titulo, area..." value={busquedaSol} onChange={e => setBusquedaSol(e.target.value)} style={{ ...inputStyle, width: 280 }} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Todos','Pendiente','En proceso','Por aprobar','Completado'].map(e => (
                      <button key={e} onClick={() => setFiltroEstadoSol(e)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : border}`, background: filtroEstadoSol === e ? `${ESTADO_COLORS[e] || accent}20` : 'transparent', color: filtroEstadoSol === e ? ESTADO_COLORS[e] || accent : t2, cursor: 'pointer' }}>{e}</button>
                    ))}
                  </div>
                </div>
                <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: s2 }}>
                          {['Titulo', 'Marca', ...(esSuperAdmin ? ['Responsable'] : []), 'Mes', 'Horas', 'Estado', 'Entrega', 'Drive'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {actividades
                          .filter(a => filtroEstadoSol === 'Todos' || a.estado === filtroEstadoSol)
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
                                {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC') : '—'}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {a.drive_url ? <a href={a.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: '#60A5FA', textDecoration: 'none' }}>🔗 Ver</a> : <span style={{ fontSize: 10, color: t3 }}>—</span>}
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
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Syne', color: t1, marginBottom: 4 }}>Disponibilidad del equipo</div>
                  <div style={{ fontSize: 12, color: t3 }}>Lunes a Viernes · 9:00 AM — 6:00 PM · Hora Guayaquil, Ecuador</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => {
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
                              <div style={{ fontSize: 10, color: t3 }}>{tareasActivas.length} tareas activas · {horasOcupadas}h ocupadas</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: disponible ? '#34D39920' : '#F8717120', color: disponible ? '#34D399' : '#F87171', fontWeight: 700 }}>
                            {disponible ? '✓ Disponible' : '✕ Ocupado'}
                          </span>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t3, marginBottom: 5 }}>
                            <span>Capacidad semanal (40h)</span>
                            <span style={{ color: disponible ? '#34D399' : '#F87171', fontWeight: 600 }}>{horasLibres}h libres</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: border, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 4, background: disponible ? '#34D399' : '#F87171', width: `${pctOcupado}%`, transition: 'width .5s' }} />
                          </div>
                          <div style={{ fontSize: 9, color: t3, marginTop: 4, textAlign: 'right' }}>{Math.round(pctOcupado)}% de capacidad utilizada</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: t3, marginBottom: 6, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Horario hoy (9am-6pm)</div>
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
                            <div style={{ fontSize: 10, color: t3, marginBottom: 6 }}>Tareas en curso:</div>
                            {tareasActivas.slice(0, 2).map(a => (
                              <div key={a.id} style={{ fontSize: 11, color: t2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: getColorMarca(a.area_ref), marginRight: 5 }}>●</span>{a.titulo}
                              </div>
                            ))}
                            {tareasActivas.length > 2 && <div style={{ fontSize: 10, color: t3 }}>+{tareasActivas.length - 2} mas</div>}
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
              {[{ key: 'team', label: '👥 Team' }, { key: 'reporte', label: '💰 Reporte' }].map(t => (
                <button key={t.key} onClick={() => setSubVista(t.key)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans', background: 'transparent', color: subVista === t.key ? t1 : t3, borderBottom: subVista === t.key ? `2px solid ${accent}` : '2px solid transparent' }}>{t.label}</button>
              ))}
            </div>
            {subVista !== 'reporte' ? (
              <div>
                {['A', 'B'].map(tipo => {
                  const miembros = usuarios.filter(u => (u.tipo === tipo || (!u.tipo && tipo === 'A')) && u.email?.toLowerCase() !== 'javier@emc.health')
                  if (!miembros.length) return null
                  return (
                    <div key={tipo} style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: tipo === 'A' ? accent : '#F472B6', marginBottom: 12, padding: '4px 12px', background: tipo === 'A' ? `${accent}15` : '#F472B615', borderRadius: 20, display: 'inline-block' }}>
                        Tipo {tipo} — {tipo === 'A' ? 'Staff Creativo' : 'Internos / Pasantes'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {miembros.map(u => {
                          const isOnline = u.online_at ? new Date(u.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
                          const tareasHoy = actividades.filter(a => a.responsable_ref === u.responsable_ref && a.estado === 'En proceso').length
                          return (
                            <div key={u.id} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
                                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{u.nombre} {u.apellido}</div>
                                  <div style={{ fontSize: 11, color: t2, marginTop: 1 }}>{u.cargo || u.rol}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: 10, color: t3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {u.email}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: isOnline ? '#34D399' : t3 }}>{isOnline ? '● Activo ahora' : 'Offline'}</span>
                                {tareasHoy > 0 && <span style={{ fontSize: 10, color: '#FBB040', background: '#FBB04015', padding: '2px 8px', borderRadius: 10 }}>{tareasHoy} en proceso</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {resumenHoras.map(r => (
                  <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                        <div style={{ fontSize: 10, color: t3 }}>{r.ref}</div>
                      </div>
                      <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#60A5FA' }}>{r.horas}h</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[{ label: 'Total', value: r.total, color: t1 }, { label: 'Completadas', value: r.completadas, color: '#34D399' }, { label: 'Efectividad', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent }].map(s => (
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
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#333' }}>Reporte de Producción para Pago</div>
            </div>
            <div id="reporte-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Reporte de produccion para pago</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {esSuperAdmin && (
                  <select value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px' }}>
                    <option value="">Seleccionar</option>
                    {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
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
                  const today = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
                  w.document.write(`<!DOCTYPE html><html><head><title>Reporte de Producción — ${nombreRep}</title>
                  <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111; padding:40px 50px; font-size:13px; }
                    @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
                  </style></head><body>
                  <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #222">
                    <div style="font-size:24px;font-weight:800;letter-spacing:.5px">Stratix Solutions</div>
                    <div style="font-size:14px;font-weight:600;margin-top:4px;color:#444">Reporte de Producción para Pago</div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
                    <div>
                      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Colaborador</div>
                      <div style="font-size:20px;font-weight:700">${nombreRep}</div>
                      <div style="font-size:11px;color:#888;font-family:monospace;margin-top:2px">${refRep}</div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Periodo</div>
                      <div style="font-size:16px;font-weight:700">${mesReporte} 2026</div>
                    </div>
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
                    ${[
                      { label: 'Total tareas', value: actsRep.length, color: '#7C6FF7' },
                      { label: 'Completadas', value: completadasRep, color: '#34D399' },
                      { label: 'Horas totales', value: totalHorasRep + 'h', color: '#F472B6' },
                      { label: 'Días producción', value: totalDiasRep, color: '#60A5FA' }
                    ].map(k => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
                      <div style="font-size:24px;font-weight:800;color:${k.color}">${k.value}</div>
                      <div style="font-size:10px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">${k.label}</div>
                    </div>`).join('')}
                  </div>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
                    <thead><tr style="background:#f8f8fa">
                      ${['#', 'Tarea', 'Área', 'Horas', 'Días Prod.', 'Mes', 'Estado'].map(h => `<th style="padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400">${h}</th>`).join('')}
                    </tr></thead>
                    <tbody>${rows}</tbody>
                  </table>
                  ${actsRep.length === 0 ? '<div style="text-align:center;padding:40px;color:#999">Sin tareas para este periodo</div>' : ''}
                  <div style="margin-top:60px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:80px">
                    <div style="text-align:center">
                      <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${nombreRep}</div>
                      <div style="font-size:10px;color:#888;margin-top:2px">Colaborador</div>
                    </div>
                    <div style="text-align:center">
                      <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">Freddy Crespín</div>
                      <div style="font-size:10px;color:#888;margin-top:2px">Coordinador de Marketing — Aprobado por</div>
                    </div>
                  </div>
                  <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
                    <span>Generado el ${today}</span>
                    <span>Stratix Solutions — Eminat MKT</span>
                  </div>
                  <div class="no-print" style="text-align:center;margin-top:30px">
                    <button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;font-size:13px;font-weight:600;cursor:pointer">Imprimir</button>
                  </div>
                  </body></html>`)
                  w.document.close()
                }} style={{ padding: '7px 14px', borderRadius: 8, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Imprimir</button>
              </div>
            </div>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Reporte de Produccion</div>
                  <div style={{ fontSize: 12, color: t3 }}>Eminat MKT — Agencia de Marketing del Holding Eminat</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: t3 }}>Periodo</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{mesReporte} 2026</div>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Colaborador</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t1 }}>{nombreRep}</div>
                <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{refRep}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                {[{ label: 'Total tareas', value: actsRep.length, color: accent }, { label: 'Completadas', value: completadasRep, color: '#34D399' }, { label: 'Horas totales', value: `${totalHorasRep}h`, color: '#F472B6' }, { label: 'Dias produccion', value: totalDiasRep, color: '#60A5FA' }].map(s => (
                  <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: s2 }}>
                    {['Tarea', 'Area', 'Horas', 'Dias Prod.', 'Estado'].map(h => (
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
              {actsRep.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>Sin tareas para este periodo</div>}
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
                <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del colaborador</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del coordinador</div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL VER ACTIVIDAD */}
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
                { label: 'Responsable', value: MIEMBROS_REFS[modalVerAct.responsable_ref] || modalVerAct.responsable_ref },
                { label: 'Solicitado por', value: SOLICITANTES.find(s => s.value === modalVerAct.solicitado_por)?.label || modalVerAct.solicitado_por || '—' },
                { label: 'Mes', value: modalVerAct.mes },
                { label: 'Trimestre', value: modalVerAct.trimestre || mesATrimestre[modalVerAct.mes || 'Enero'] || 'Q1' },
                { label: 'Horas estimadas', value: `${modalVerAct.horas || 0}h` },
                { label: 'Dias produccion', value: modalVerAct.dias_produccion || '0' },
                { label: 'Fecha entrega', value: modalVerAct.fecha_entrega ? new Date(modalVerAct.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'long' }) : 'Sin fecha' },
                { label: 'Verificado', value: modalVerAct.verificado ? '✓ Si' : '✕ No' },
              ].map(item => (
                <div key={item.label} style={{ background: s2, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 2, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: t3, marginBottom: 8, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>Cambiar estado</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLUMNAS_KANBAN.map(col => (
                  <button key={col} onClick={async () => {
                    await supabase.from('actividades').update({ estado: col }).eq('id', modalVerAct.id)
                    setActividades(prev => prev.map(a => a.id === modalVerAct.id ? { ...a, estado: col } : a))
                    setModalVerAct((p: any) => ({ ...p, estado: col }))
                    mostrarMensaje('ok', `Estado → "${col}"`)
                  }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `2px solid ${modalVerAct.estado === col ? ESTADO_COLORS[col] : border}`, background: modalVerAct.estado === col ? `${ESTADO_COLORS[col]}20` : 'transparent', color: modalVerAct.estado === col ? ESTADO_COLORS[col] : t2, cursor: 'pointer', fontWeight: modalVerAct.estado === col ? 700 : 400 }}>{col}</button>
                ))}
              </div>
            </div>
            {modalVerAct.drive_url && (
              <a href={modalVerAct.drive_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: `${accent}15`, color: accent, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                🔗 Ver carpeta en Google Drive
              </a>
            )}
          </div>
        </div>
      )}

      {/* MODAL NUEVA TAREA */}
      {modalNuevaAct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Nueva tarea</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Completa los campos para agregar al Kanban</div>
              </div>
              <button onClick={() => setModalNuevaAct(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Titulo de la tarea <span style={{ color: '#F87171' }}>*</span></label>
              <input type="text" value={nuevaAct.titulo} onChange={e => setNuevaAct(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. Disenar banner para EMC redes sociales" autoFocus style={{ ...inputStyle, fontSize: 14, padding: '11px 14px' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Descripcion (opcional)</label>
              <textarea value={nuevaAct.descripcion} onChange={e => setNuevaAct(p => ({ ...p, descripcion: e.target.value }))} placeholder="Detalla que incluye esta tarea..." rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🎨 Marca / Area <span style={{ color: '#F87171' }}>*</span></label>
                <select value={nuevaAct.area_ref} onChange={e => setNuevaAct(p => ({ ...p, area_ref: e.target.value }))} style={inputStyle}>
                  {MARCAS_LIST.map(a => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>👤 Responsable <span style={{ color: '#F87171' }}>*</span></label>
                <select value={nuevaAct.responsable_ref} onChange={e => setNuevaAct(p => ({ ...p, responsable_ref: e.target.value }))} style={inputStyle}>
                  {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => <option key={ref} value={ref}>{nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📨 Solicitado por</label>
              <select value={nuevaAct.solicitado_por} onChange={e => setNuevaAct(p => ({ ...p, solicitado_por: e.target.value }))} style={inputStyle}>
                {SOLICITANTES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📅 Mes</label>
                <select value={nuevaAct.mes} onChange={e => setNuevaAct(p => ({ ...p, mes: e.target.value }))} style={inputStyle}>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⏱ Horas estimadas</label>
                <input type="number" value={nuevaAct.horas} onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📆 Dias prod.</label>
                <input type="number" value={nuevaAct.dias_produccion} onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⚡ Estado inicial</label>
                <select value={nuevaAct.estado} onChange={e => setNuevaAct(p => ({ ...p, estado: e.target.value }))} style={inputStyle}>
                  {COLUMNAS_KANBAN.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🗓 Fecha de entrega</label>
                <input type="date" value={nuevaAct.fecha_entrega} onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🔗 Link Google Drive (opcional)</label>
              <input type="url" value={nuevaAct.drive_url} onChange={e => setNuevaAct(p => ({ ...p, drive_url: e.target.value }))} placeholder="https://drive.google.com/drive/folders/..." style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalNuevaAct(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearActividad} disabled={creandoAct || !nuevaAct.titulo.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: creandoAct || !nuevaAct.titulo.trim() ? t3 : accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: creandoAct || !nuevaAct.titulo.trim() ? 'not-allowed' : 'pointer' }}>
                {creandoAct ? '⏳ Creando...' : '✓ Crear tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
