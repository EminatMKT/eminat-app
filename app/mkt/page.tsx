'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const COLUMNAS = ['Pendiente', 'En proceso', 'Por aprobar', 'Completado']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const COL_COLORS: Record<string, string> = {
  'Pendiente': '#9494B3',
  'En proceso': '#7C6FF7',
  'Por aprobar': '#FBB040',
  'Completado': '#34D399',
}

const MIEMBROS_REFS: Record<string, string> = {
  'DG_Joselyn': 'Joselyn',
  'DGA_David': 'David',
  'Jonathan_CRM': 'Jonathan',
  'DG_Ariana': 'Ariana',
  'CM_ Naomi': 'Naomi',
  'EV_Bryan': 'Bryan',
  'Coord_MFreddy': 'Freddy',
}

const MARCAS = [
  { codigo: 'EMC', color: '#60A5FA' },
  { codigo: 'SVN', color: '#F472B6' },
  { codigo: 'ERG', color: '#A78BFA' },
  { codigo: 'VNF', color: '#FB923C' },
  { codigo: 'PREMIER', color: '#34D399' },
]

export default function MKTPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [tab, setTab] = useState<'kanban' | 'horas' | 'reporte'>('kanban')
  const [mesKanban, setMesKanban] = useState('')
  const [mesHoras, setMesHoras] = useState('')
  const [mesReporte, setMesReporte] = useState(MESES[new Date().getMonth()])
  const [miembroReporte, setMiembroReporte] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
    setUsuario(usr)

    const esSuperAdmin = usr?.rol === 'superadmin' || usr?.rol === 'coordinador'
    let query = supabase.from('actividades').select('*').order('fecha_entrega', { ascending: true })
    if (!esSuperAdmin && usr?.responsable_ref) {
      query = query.eq('responsable_ref', usr.responsable_ref)
    }
    const { data } = await query
    setActividades(data || [])
    if (!esSuperAdmin && usr?.responsable_ref) {
      setMiembroReporte(usr.responsable_ref)
    }
    setLoading(false)
  }

  const esSuperAdmin = usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador'

  // DRAG & DROP
  function onDragStart(id: string) { setDragId(id) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }

  async function onDrop(e: React.DragEvent, nuevoEstado: string) {
    e.preventDefault()
    if (!dragId) return
    const act = actividades.find(a => a.id === dragId)
    if (!act || act.estado === nuevoEstado) { setDragId(null); return }
    setGuardando(true)
    await supabase.from('actividades').update({ estado: nuevoEstado }).eq('id', dragId)
    setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: nuevoEstado } : a))
    setDragId(null)
    setGuardando(false)
  }

  // Datos Kanban
  const mesesDisponibles = actividades.map(a => a.mes).filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i)
  const actsKanban = mesKanban ? actividades.filter(a => a.mes === mesKanban) : actividades
  const porColumna = (col: string) => actsKanban.filter(a => a.estado === col)

  // Datos Horas
  const actsHoras = mesHoras ? actividades.filter(a => a.mes === mesHoras) : actividades
  const refs = esSuperAdmin ? Object.keys(MIEMBROS_REFS) : [usuario?.responsable_ref].filter(Boolean)
  const resumenHoras = refs.map(ref => {
    const acts = actsHoras.filter(a => a.responsable_ref === ref)
    return {
      ref,
      nombre: MIEMBROS_REFS[ref] || ref,
      total: acts.length,
      completadas: acts.filter(a => a.estado === 'Completado').length,
      horas: Math.round(acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
      dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0),
    }
  }).filter(r => r.total > 0)

  // Datos Reporte
  const refReporte = miembroReporte || refs[0] || ''
  const actsReporte = actividades.filter(a => {
    const matchMes = a.mes === mesReporte
    if (refReporte === 'Coord_MFreddy') return matchMes && (a.responsable_ref === refReporte || a.solicitado_por === refReporte)
    return matchMes && a.responsable_ref === refReporte
  })
  const totalHorasRep = Math.round(actsReporte.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDiasRep = actsReporte.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const completadasRep = actsReporte.filter(a => a.estado === 'Completado').length
  const nombreReporte = MIEMBROS_REFS[refReporte] || usuario?.nombre || refReporte

  const bg = dark ? '#0A0A0F' : '#F5F5F7'
  const s1 = dark ? '#111118' : '#FFFFFF'
  const s2 = dark ? '#1A1A24' : '#F0F0F5'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#FFFFFF' : '#0A0A0F'
  const t2 = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const t3 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
  const accent = '#7C6FF7'
  const cargo = usuario?.rol === 'superadmin' ? 'Coordinador de Marketing' : usuario?.rol || 'Colaborador'

  const inputStyle = {
    padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`,
    background: s2, color: t1, fontSize: 12, fontFamily: 'DM Sans', outline: 'none'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ fontSize: 14, color: t3 }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: s1, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: t1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
            eminat app
          </div>
        </div>

        <nav style={{ padding: '10px 7px', overflowY: 'auto', flex: 1 }}>
          {[
            { icon: '🏠', label: 'Dashboard', href: '/dashboard' },
            { icon: '📋', label: 'Solicitudes', href: '/solicitudes' },
            { icon: '📅', label: 'Calendario', href: '/calendario' },
            { icon: '👥', label: 'Equipo', href: '/equipo' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: t2, marginBottom: 1 }}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '12px 8px 5px' }}>Produccion</div>
          {[
            { icon: '🚀', label: 'Eminat MKT', href: '/mkt', active: true },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: accent, background: `${accent}18`, marginBottom: 1 }}>
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '12px 8px 5px' }}>Marcas</div>
          {MARCAS.map(a => (
            <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 10, fontSize: 13, color: t2, cursor: 'pointer', marginBottom: 1 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.color }} />
              {a.codigo}
            </div>
          ))}

          {/* TARJETA USUARIO */}
          <div style={{ margin: '12px 4px 0', padding: '12px', borderRadius: 12, background: `${accent}10`, border: `1px solid ${accent}25` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                  {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#34D399', border: `2px solid ${s1}` }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre} {usuario?.apellido}</div>
                <div style={{ fontSize: 10, color: accent, fontWeight: 500 }}>{cargo}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: t3, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <span>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.ubicacion || 'Guayaquil, Ecuador'}</span>
            </div>
            <Link href="/dashboard" style={{ display: 'block', width: '100%', padding: '6px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans', textDecoration: 'none', textAlign: 'center' }}>
              ← Dashboard
            </Link>
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div style={{ padding: '12px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s1, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1 }}>Eminat MKT</div>
            <div style={{ fontSize: 10, color: t3, marginTop: 1 }}>Panel de produccion del equipo de marketing</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {guardando && <span style={{ fontSize: 11, color: '#FBB040' }}>Guardando...</span>}
            <button onClick={() => setDark(!dark)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer' }}>
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            {esSuperAdmin && (
              <Link href="/admin" style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.08)', color: '#F87171', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}>🔐 Admin</Link>
            )}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0', borderBottom: `1px solid ${border}`, background: s1 }}>
          {[
            { key: 'kanban', label: '⚡ Kanban' },
            { key: 'horas', label: '⏱ Horas' },
            { key: 'reporte', label: '💰 Reporte' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{
              padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', borderRadius: '8px 8px 0 0', fontFamily: 'DM Sans',
              background: tab === t.key ? bg : 'transparent',
              color: tab === t.key ? t1 : t3,
              borderBottom: tab === t.key ? `2px solid ${accent}` : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflow: 'auto' }}>

          {/* ===== KANBAN ===== */}
          {tab === 'kanban' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Pipeline de produccion</span>
                  <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>Arrastra las tarjetas para cambiar su estado</span>
                </div>
                <select value={mesKanban} onChange={e => setMesKanban(e.target.value)} style={inputStyle}>
                  <option value="">Todos los meses</option>
                  {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {COLUMNAS.map(col => (
                  <div key={col}
                    onDragOver={onDragOver}
                    onDrop={e => onDrop(e, col)}
                    style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', minHeight: 400, borderTop: `3px solid ${COL_COLORS[col]}` }}
                  >
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COL_COLORS[col] }}>{col}</span>
                      <span style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', background: s2, padding: '2px 7px', borderRadius: 10 }}>{porColumna(col).length}</span>
                    </div>
                    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 360 }}>
                      {porColumna(col).map(a => (
                        <div key={a.id}
                          draggable
                          onDragStart={() => onDragStart(a.id)}
                          style={{
                            background: s2, borderRadius: 10, padding: '10px 12px',
                            border: `1px solid ${dragId === a.id ? accent : border}`,
                            cursor: 'grab', transition: 'all .15s',
                            opacity: dragId === a.id ? .5 : 1,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 500, color: t1, lineHeight: 1.4, marginBottom: 6 }}>{a.titulo}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: t3 }}>{esSuperAdmin ? a.responsable_ref : a.mes}</span>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: `${accent}20`, color: accent, fontWeight: 600 }}>{a.area_ref}</span>
                          </div>
                          {a.fecha_entrega && (
                            <div style={{ fontSize: 9, color: t3, marginTop: 4 }}>
                              📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC')}
                            </div>
                          )}
                        </div>
                      ))}
                      {porColumna(col).length === 0 && (
                        <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: '24px', textAlign: 'center', color: t3, fontSize: 11 }}>
                          Arrastra aqui
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== HORAS ===== */}
          {tab === 'horas' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Resumen de horas</span>
                  <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>{esSuperAdmin ? 'Todo el equipo' : 'Tus horas'}</span>
                </div>
                <select value={mesHoras} onChange={e => setMesHoras(e.target.value)} style={inputStyle}>
                  <option value="">Todos los meses</option>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {resumenHoras.map(r => (
                  <div key={r.ref} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{r.nombre}</div>
                        <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', marginTop: 2 }}>{r.ref}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#60A5FA', lineHeight: 1 }}>{r.horas}h</div>
                        <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{r.dias} dias prod.</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                      {[
                        { label: 'Total tareas', value: r.total, color: t1 },
                        { label: 'Completadas', value: r.completadas, color: '#34D399' },
                        { label: 'Efectividad', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: accent },
                      ].map(s => (
                        <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: `rgba(255,255,255,0.07)`, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: '#34D399', width: `${r.total > 0 ? (r.completadas / r.total) * 100 : 0}%`, transition: 'width .5s' }} />
                    </div>
                  </div>
                ))}
                {resumenHoras.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', color: t3 }}>No hay datos de horas</div>
                )}
              </div>
            </div>
          )}

          {/* ===== REPORTE ===== */}
          {tab === 'reporte' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Reporte de produccion</span>
                  <span style={{ fontSize: 11, color: t3, marginLeft: 8 }}>Para calculo de pago mensual</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {esSuperAdmin && (
                    <select value={miembroReporte} onChange={e => setMiembroReporte(e.target.value)} style={inputStyle}>
                      <option value="">Seleccionar miembro</option>
                      {Object.entries(MIEMBROS_REFS).map(([ref, nombre]) => (
                        <option key={ref} value={ref}>{nombre}</option>
                      ))}
                    </select>
                  )}
                  <select value={mesReporte} onChange={e => setMesReporte(e.target.value)} style={inputStyle}>
                    {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: accent, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Imprimir
                  </button>
                </div>
              </div>

              <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '24px 28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Reporte de Produccion</div>
                    <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>Holding Eminat — Departamento de Marketing</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: t3 }}>Periodo</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{mesReporte} 2026</div>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Colaborador</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t1 }}>{nombreReporte}</div>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', marginTop: 2 }}>{refReporte}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Total tareas', value: actsReporte.length, color: accent },
                    { label: 'Completadas', value: completadasRep, color: '#34D399' },
                    { label: 'Horas totales', value: `${totalHorasRep}h`, color: '#F472B6' },
                    { label: 'Dias produccion', value: totalDiasRep, color: '#60A5FA' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s2, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: s2 }}>
                      {['Tarea', 'Area', 'Horas', 'Dias', 'Estado'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actsReporte.map(a => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: '9px 12px', color: t1 }}>{a.titulo}</td>
                        <td style={{ padding: '9px 12px', color: t3 }}>{a.area_ref}</td>
                        <td style={{ padding: '9px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.horas}h</td>
                        <td style={{ padding: '9px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.dias_produccion}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${COL_COLORS[a.estado] || t3}20`, color: COL_COLORS[a.estado] || t3 }}>
                            {a.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {actsReporte.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: t3 }}>No hay tareas para este periodo</div>
                )}

                <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del colaborador</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, fontSize: 11, color: t3 }}>Firma del coordinador</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
