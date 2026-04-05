'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const TRIMESTRES = ['Q1', 'Q2', 'Q3', 'Q4']
const MESES_Q: Record<string, string[]> = {
  Q1: ['Enero', 'Febrero', 'Marzo'],
  Q2: ['Abril', 'Mayo', 'Junio'],
  Q3: ['Julio', 'Agosto', 'Septiembre'],
  Q4: ['Octubre', 'Noviembre', 'Diciembre'],
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [equipo, setEquipo] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [trimestre, setTrimestre] = useState('Q1')
  const router = useRouter()

  useEffect(() => { cargarDashboard() }, [])

  async function cargarDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
    setUsuario(usr)

    const { data: acts } = await supabase
      .from('actividades').select('*').order('fecha_entrega', { ascending: false }).limit(8)
    setActividades(acts || [])

    const { data: team } = await supabase.from('v_equipo_hoy').select('*')
    setEquipo(team || [])

    setLoading(false)
  }

  async function handleLogout() {
    if (usuario?.id && usuario?.marca_hora) {
      await supabase.rpc('registrar_salida', { p_usuario_id: usuario.id })
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  const mesesQ = MESES_Q[trimestre]
  const actsFiltradas = actividades.filter(a => mesesQ.includes(a.mes))
  const totalQ = actsFiltradas.length
  const completadasQ = actsFiltradas.filter(a => a.estado === 'Completado').length
  const enProcesoQ = actsFiltradas.filter(a => a.estado === 'En proceso').length
  const pendientesQ = actsFiltradas.filter(a => a.estado === 'Pendiente').length
  const pctCompletado = totalQ > 0 ? Math.round((completadasQ / totalQ) * 100) : 0

  // Datos por mes para mini gráfico
  const datosPorMes = mesesQ.map(mes => ({
    mes,
    total: actividades.filter(a => a.mes === mes).length,
    completadas: actividades.filter(a => a.mes === mes && a.estado === 'Completado').length,
  }))
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)

  const bg = dark ? '#0A0A0F' : '#F5F5F7'
  const s1 = dark ? '#111118' : '#FFFFFF'
  const s2 = dark ? '#1A1A24' : '#F0F0F5'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#FFFFFF' : '#0A0A0F'
  const t2 = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const t3 = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
  const accent = '#7C6FF7'

  const ESTADO_COLORS: any = {
    'Completado': '#34D399',
    'Por aprobar': '#FBB040',
    'En proceso': '#7C6FF7',
    'Pendiente': '#9494B3'
  }

  const MARCAS = [
    { codigo: 'EMC', color: '#60A5FA' },
    { codigo: 'SVN', color: '#F472B6' },
    { codigo: 'ERG', color: '#A78BFA' },
    { codigo: 'VNF', color: '#FB923C' },
    { codigo: 'PREMIER', color: '#34D399' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ fontSize: 14, color: t3 }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif', transition: 'all .3s' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: s1, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: t1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
            eminat app
          </div>
        </div>

        <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          {[
            { icon: '🏠', label: 'Dashboard', href: '/dashboard', active: true },
            { icon: '📋', label: 'Solicitudes', href: '/solicitudes' },
            { icon: '📅', label: 'Calendario', href: '/calendario' },
            { icon: '👥', label: 'Equipo', href: '/equipo' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
              borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              color: item.active ? accent : t2,
              background: item.active ? `${accent}18` : 'transparent', marginBottom: 1
            }}><span>{item.icon}</span>{item.label}</Link>
          ))}

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '14px 8px 6px' }}>Reportes</div>
          {[
            { icon: '⚡', label: 'Producción', href: '/produccion' },
            { icon: '⏱', label: 'Horas', href: '/horas' },
            { icon: '💰', label: 'Pagos', href: '/pagos' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
              borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              color: t2, marginBottom: 1
            }}><span>{item.icon}</span>{item.label}</Link>
          ))}

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '14px 8px 6px' }}>Marcas</div>
          {MARCAS.map(a => (
            <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 10, fontSize: 13, color: t2, cursor: 'pointer', marginBottom: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
              {a.codigo}
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre}</div>
            <div style={{ fontSize: 10, color: t3 }}>{usuario?.rol}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: t3, fontSize: 16, cursor: 'pointer', padding: 2 }} title="Cerrar sesión">↩</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div style={{ padding: '14px 28px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s1, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: t1 }}>
              Buen día, {usuario?.nombre} 👋
            </div>
            <div style={{ fontSize: 11, color: t3, fontFamily: 'DM Mono', marginTop: 2 }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Dark/Light toggle */}
            <button onClick={() => setDark(!dark)} style={{
              padding: '7px 14px', borderRadius: 20, border: `1px solid ${border}`,
              background: s2, color: t2, fontSize: 12, cursor: 'pointer', fontWeight: 500
            }}>
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            {(usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador') && (
              <Link href="/admin" style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.08)', color: '#F87171', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>🔐 Admin</Link>
            )}
            <Link href="/solicitar" style={{ padding: '7px 16px', borderRadius: 10, background: accent, color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>+ Nueva solicitud</Link>
          </div>
        </div>

        <div style={{ padding: '22px 28px', flex: 1 }}>

          {/* SELECTOR DE TRIMESTRE */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {TRIMESTRES.map(q => (
              <button key={q} onClick={() => setTrimestre(q)} style={{
                padding: '6px 20px', borderRadius: 20, border: `1px solid ${trimestre === q ? accent : border}`,
                background: trimestre === q ? accent : 'transparent',
                color: trimestre === q ? 'white' : t2,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s'
              }}>{q}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              {mesesQ.map(m => (
                <span key={m} style={{ fontSize: 11, color: t3, fontFamily: 'DM Mono' }}>{m}</span>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Tareas', value: totalQ, color: accent, icon: '📊' },
              { label: 'Completadas', value: completadasQ, color: '#34D399', icon: '✅' },
              { label: 'En Proceso', value: enProcesoQ, color: '#FBB040', icon: '⚡' },
              { label: 'Efectividad', value: `${pctCompletado}%`, color: '#F472B6', icon: '🎯' },
            ].map(k => (
              <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 14, right: 16, fontSize: 20, opacity: .15 }}>{k.icon}</div>
                <div style={{ fontSize: 10, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10, fontFamily: 'DM Mono' }}>{k.label}</div>
                <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, lineHeight: 1, color: k.color }}>{k.value}</div>
                <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: border }}>
                  <div style={{ height: 3, borderRadius: 2, background: k.color, width: totalQ > 0 ? `${Math.min((Number(String(k.value).replace('%','')) / (totalQ || 1)) * 100, 100)}%` : '0%', transition: 'width .5s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* GRÁFICO DE BARRAS POR MES */}
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t1, marginBottom: 16 }}>Producción por mes — {trimestre}</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 100 }}>
              {datosPorMes.map(d => (
                <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{d.completadas}/{d.total}</div>
                  <div style={{ width: '100%', display: 'flex', gap: 4, alignItems: 'flex-end', height: 72 }}>
                    <div style={{ flex: 1, background: `${accent}30`, borderRadius: '4px 4px 0 0', height: `${(d.total / maxTotal) * 100}%`, minHeight: 4, transition: 'height .5s' }} />
                    <div style={{ flex: 1, background: '#34D399', borderRadius: '4px 4px 0 0', height: `${(d.completadas / maxTotal) * 100}%`, minHeight: d.completadas > 0 ? 4 : 0, transition: 'height .5s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: t2, textAlign: 'center' }}>{d.mes.slice(0, 3)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', paddingBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: t3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: `${accent}30` }} /> Total
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: t3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#34D399' }} /> Completadas
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVIDADES + EQUIPO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

            {/* Actividades recientes */}
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>Actividades recientes</div>
                  <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{trimestre} · {mesesQ.join(', ')}</div>
                </div>
                <Link href="/solicitudes" style={{ fontSize: 11, color: accent, textDecoration: 'none', fontWeight: 500 }}>Ver todas →</Link>
              </div>
              {actividades.slice(0, 6).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: `1px solid ${border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ESTADO_COLORS[a.estado] || t3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                    <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{a.area_ref} · {a.responsable_ref}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 9, fontFamily: 'DM Mono', background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3, whiteSpace: 'nowrap' }}>
                    {a.estado}
                  </span>
                </div>
              ))}
            </div>

            {/* Equipo hoy */}
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>Equipo hoy</div>
                <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>Estado en tiempo real</div>
              </div>
              {equipo.map(u => (
                <div key={u.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </div>
                    {u.estado_hoy === 'presente' && (
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#34D399', border: `2px solid ${s1}` }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{u.nombre}</div>
                    <div style={{ fontSize: 10, color: t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.estado_hoy === 'presente' ? `Entrada ${u.hora_entrada?.slice(11, 16)}` :
                       u.estado_hoy === 'sin_marcacion' ? 'Sin marcación (pasante)' : 'Sin registrar'}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: u.estado_hoy === 'presente' ? '#34D399' : t3, fontFamily: 'DM Mono', flexShrink: 0 }}>
                    {u.tareas_activas} tareas
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
