'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const TRIMESTRES = ['General', 'Q1', 'Q2', 'Q3', 'Q4']
const MESES_Q: Record<string, string[]> = {
  General: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  Q1: ['Enero', 'Febrero', 'Marzo'],
  Q2: ['Abril', 'Mayo', 'Junio'],
  Q3: ['Julio', 'Agosto', 'Septiembre'],
  Q4: ['Octubre', 'Noviembre', 'Diciembre'],
}

const MARCAS = [
  { codigo: 'EMC', color: '#60A5FA' },
  { codigo: 'SVN', color: '#F472B6' },
  { codigo: 'ERG', color: '#A78BFA' },
  { codigo: 'VNF', color: '#FB923C' },
  { codigo: 'PREMIER', color: '#34D399' },
]

const ESTADO_COLORS: Record<string, string> = {
  'Completado': '#34D399',
  'Por aprobar': '#FBB040',
  'En proceso': '#7C6FF7',
  'Pendiente': '#9494B3',
}

const CARGOS: Record<string, string> = {
  'superadmin': 'Coordinador de Marketing',
  'coordinador': 'Coordinador',
  'colaborador': 'Colaborador Creativo',
  'pasante': 'Pasante',
  'externo': 'Externo',
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [equipo, setEquipo] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [trimestre, setTrimestre] = useState('General')
  const [horaActual, setHoraActual] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const router = useRouter()

  const actualizarHeartbeat = useCallback(async (userId: string) => {
    await supabase
      .from('usuarios')
      .update({ online_at: new Date().toISOString() })
      .eq('id', userId)
  }, [])

  const contarOnline = useCallback(async () => {
    const hace5min = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .gte('online_at', hace5min)
    setOnlineCount(count || 0)
  }, [])

  useEffect(() => {
    cargarDashboard()
    const reloj = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(reloj)
  }, [])

  async function cargarDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
    setUsuario(usr)

    if (usr?.id) {
      await actualizarHeartbeat(usr.id)
      const heartbeat = setInterval(async () => {
        await actualizarHeartbeat(usr.id)
        await contarOnline()
      }, 30000)
      await contarOnline()
      window.addEventListener('beforeunload', () => clearInterval(heartbeat))
    }

    const { data: acts } = await supabase.from('actividades').select('*').order('fecha_entrega', { ascending: false })
    setActividades(acts || [])

    const { data: team } = await supabase.from('v_equipo_hoy').select('*')
    setEquipo(team || [])

    const { data: usrs } = await supabase.from('usuarios').select('*').eq('activo', true)
    setUsuarios(usrs || [])

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
  const actsFiltradas = trimestre === 'General' ? actividades : actividades.filter(a => mesesQ.includes(a.mes))
  const totalQ = actsFiltradas.length
  const completadasQ = actsFiltradas.filter(a => a.estado === 'Completado').length
  const enProcesoQ = actsFiltradas.filter(a => a.estado === 'En proceso').length
  const pendientesQ = actsFiltradas.filter(a => a.estado === 'Pendiente').length
  const pctCompletado = totalQ > 0 ? Math.round((completadasQ / totalQ) * 100) : 0
  const totalHoras = actsFiltradas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0)
  const totalDias = actsFiltradas.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)

  const mesesGrafico = trimestre === 'General'
    ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    : mesesQ.map(m => m.slice(0, 3))
  const mesesFull = trimestre === 'General' ? MESES_Q['General'] : mesesQ
  const datosPorMes = mesesFull.map((mes, i) => ({
    mes: mesesGrafico[i],
    total: actividades.filter(a => a.mes === mes).length,
    completadas: actividades.filter(a => a.mes === mes && a.estado === 'Completado').length,
  }))
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)

  const datosPorMarca = MARCAS.map(m => ({
    ...m,
    total: actsFiltradas.filter(a => a.area_ref === m.codigo).length,
    completadas: actsFiltradas.filter(a => a.area_ref === m.codigo && a.estado === 'Completado').length,
  })).filter(m => m.total > 0)
  const maxMarca = Math.max(...datosPorMarca.map(d => d.total), 1)

  const datosPorMiembro = ['DG_Joselyn','DGA_David','Jonathan_CRM','DG_Ariana','CM_ Naomi','EV_Bryan','Coord_MFreddy'].map(ref => ({
    ref,
    nombre: ref.replace('DG_','').replace('DGA_','').replace('_CRM','').replace('CM_ ','').replace('EV_','').replace('Coord_M',''),
    total: actsFiltradas.filter(a => a.responsable_ref === ref).length,
    completadas: actsFiltradas.filter(a => a.responsable_ref === ref && a.estado === 'Completado').length,
    horas: actsFiltradas.filter(a => a.responsable_ref === ref).reduce((acc, a) => acc + (Number(a.horas) || 0), 0),
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  const maxMiembro = Math.max(...datosPorMiembro.map(d => d.total), 1)

  const hoy = new Date()
  const diasRestantes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - hoy.getDate()
  const horasDisponibles = diasRestantes * 8

  const equipoOnline = equipo.filter(u => {
    const userInfo = usuarios.find(us => us.nombre === u.nombre)
    if (!userInfo?.online_at) return false
    return new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000)
  })

  const bg = dark ? '#0A0A0F' : '#F5F5F7'
  const s1 = dark ? '#111118' : '#FFFFFF'
  const s2 = dark ? '#1A1A24' : '#F0F0F5'
  const border = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const t1 = dark ? '#FFFFFF' : '#0A0A0F'
  const t2 = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const t3 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
  const accent = '#7C6FF7'

  const cargo = CARGOS[usuario?.rol] || usuario?.rol || 'Colaborador'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ fontSize: 14, color: t3 }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif', transition: 'background .3s, color .3s' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: s1, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'background .3s' }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: t1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
            eminat app
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 7px', overflowY: 'auto', flex: 1 }}>
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

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '12px 8px 5px' }}>Reportes</div>
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

          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', padding: '12px 8px 5px' }}>Marcas</div>
          {MARCAS.map(a => (
            <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 10, fontSize: 13, color: t2, cursor: 'pointer', marginBottom: 1 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.color }} />
              {a.codigo}
            </div>
          ))}

          {/* TARJETA USUARIO */}
          <div style={{ margin: '12px 4px 0', padding: '12px', borderRadius: 12, background: `${accent}10`, border: `1px solid ${accent}25` }}>
            {/* Avatar + nombre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: usuario?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                  {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#34D399', border: `2px solid ${s1}` }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre} {usuario?.apellido}</div>
                <div style={{ fontSize: 10, color: accent, fontWeight: 500 }}>{cargo}</div>
              </div>
            </div>

            {/* Ubicación */}
            <div style={{ fontSize: 10, color: t3, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.ubicacion || 'Guayaquil, Ecuador'}</span>
            </div>

            {/* Reuniones del día */}
            <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              Reuniones hoy
            </div>
            <div style={{ background: `${accent}08`, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: t3, lineHeight: 1.4 }}>
                🔗 Conecta Google Calendar para ver tus reuniones
              </div>
              <button style={{ marginTop: 6, fontSize: 10, color: accent, background: 'none', border: `1px solid ${accent}40`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Conectar →
              </button>
            </div>

            {/* Logout */}
            <button onClick={handleLogout} style={{ width: '100%', marginTop: 10, padding: '6px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans' }}>
              ↩ Cerrar sesión
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div style={{ padding: '12px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s1, position: 'sticky', top: 0, zIndex: 10, transition: 'background .3s' }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: t1 }}>Buen día, {usuario?.nombre} 👋</div>
            <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', marginTop: 1 }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {horaActual}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Online indicator — siempre activo si está en la web */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: '#34D39915', border: '1px solid #34D39940' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
              <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>{onlineCount > 0 ? onlineCount : 1} online</span>
            </div>
            <button onClick={() => setDark(!dark)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
            {(usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador') && (
              <Link href="/admin" style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.08)', color: '#F87171', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}>🔐 Admin</Link>
            )}
            <Link href="/solicitar" style={{ padding: '6px 14px', borderRadius: 10, background: accent, color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>+ Nueva solicitud</Link>
          </div>
        </div>

        <div style={{ padding: '18px 24px', flex: 1 }}>

          {/* SELECTOR TRIMESTRE */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 16, alignItems: 'center' }}>
            {TRIMESTRES.map(q => (
              <button key={q} onClick={() => setTrimestre(q)} style={{
                padding: '5px 16px', borderRadius: 20, border: `1px solid ${trimestre === q ? accent : border}`,
                background: trimestre === q ? accent : 'transparent',
                color: trimestre === q ? 'white' : t2,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s'
              }}>{q}</button>
            ))}
            <span style={{ marginLeft: 8, fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>
              {trimestre !== 'General' ? mesesQ.join(' · ') : 'Enero — Diciembre 2026'}
            </span>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Total Tareas', value: totalQ, color: accent, sub: 'actividades' },
              { label: 'Completadas', value: completadasQ, color: '#34D399', sub: `${pctCompletado}% efectividad` },
              { label: 'En Proceso', value: enProcesoQ, color: '#FBB040', sub: 'en curso' },
              { label: 'Pendientes', value: pendientesQ, color: '#9494B3', sub: 'sin iniciar' },
              { label: 'Horas Totales', value: `${totalHoras}h`, color: '#F472B6', sub: `${totalDias} días prod.` },
              { label: 'Horas Libres', value: `${horasDisponibles}h`, color: '#60A5FA', sub: `${diasRestantes} días restantes` },
            ].map(k => (
              <div key={k.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', transition: 'background .3s' }}>
                <div style={{ fontSize: 9, color: t3, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, fontFamily: 'DM Mono' }}>{k.label}</div>
                <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, lineHeight: 1, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>{k.sub}</div>
                <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: border }}>
                  <div style={{ height: 2, borderRadius: 1, background: k.color, width: `${pctCompletado}%`, transition: 'width .5s' }} />
                </div>
              </div>
            ))}
          </div>

          {/* GRÁFICOS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 12, marginBottom: 14 }}>

            {/* Por mes */}
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', transition: 'background .3s' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 4 }}>Producción por mes</div>
              <div style={{ fontSize: 10, color: t3, marginBottom: 12 }}>{trimestre}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90 }}>
                {datosPorMes.map(d => (
                  <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 8, color: t3, fontFamily: 'DM Mono' }}>{d.total}</div>
                    <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 66 }}>
                      <div style={{ flex: 1, background: `${accent}25`, borderRadius: '3px 3px 0 0', height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? 3 : 0 }} />
                      <div style={{ flex: 1, background: '#34D399', borderRadius: '3px 3px 0 0', height: `${(d.completadas / maxTotal) * 100}%`, minHeight: d.completadas > 0 ? 3 : 0 }} />
                    </div>
                    <div style={{ fontSize: 9, color: t3 }}>{d.mes}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: t3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: `${accent}25` }} /> Total
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: t3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#34D399' }} /> Completadas
                </div>
              </div>
            </div>

            {/* Por marca */}
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', transition: 'background .3s' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t1, marginBottom: 4 }}>Por marca</div>
              <div style={{ fontSize: 10, color: t3, marginBottom: 12 }}>{trimestre}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {datosPorMarca.map(m => (
                  <div key={m.codigo} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: t2, width: 52, flexShrink: 0 }}>{m.codigo}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: m.color, width: `${(m.total / maxMarca) * 100}%`, transition: 'width .5s' }} />
                    </div>
                    <span style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', width: 28, textAlign: 'right' }}>{m.total}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Completado', value: pctCompletado, color: '#34D399' },
                  { label: 'En proceso', value: totalQ > 0 ? Math.round((enProcesoQ / totalQ) * 100) : 0, color: accent },
                  { label: 'Pendiente', value: totalQ > 0 ? Math.round((pendientesQ / totalQ) * 100) : 0, color: '#9494B3' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', color: s.color }}>{s.value}%</div>
                    <div style={{ fontSize: 9, color: t3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipo online */}
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', transition: 'background .3s' }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Equipo hoy</div>
                  <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>En tiempo real</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#34D399' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                  {onlineCount > 0 ? onlineCount : 1} online
                </div>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 220 }}>
                {equipo.map(u => {
                  const userInfo = usuarios.find(us => us.nombre === u.nombre)
                  const isOnline = userInfo?.online_at
                    ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000)
                    : u.estado_hoy === 'presente'
                  return (
                    <div key={u.id} style={{ padding: '9px 14px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                          {u.nombre?.[0]}{u.apellido?.[0]}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#34D399' : '#9494B3', border: `2px solid ${s1}` }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t1 }}>{u.nombre}</div>
                        <div style={{ fontSize: 9, color: t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📍 {userInfo?.ubicacion || 'Guayaquil, Ecuador'}
                        </div>
                        <div style={{ fontSize: 9, color: isOnline ? '#34D399' : t3 }}>
                          {isOnline ? `● Activo ahora` : u.estado_hoy === 'presente' ? `⏰ ${u.hora_entrada?.slice(11, 16)}` : u.estado_hoy === 'sin_marcacion' ? 'Pasante' : 'Sin registrar'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ACTIVIDADES + RANKING */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', transition: 'background .3s' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Actividades recientes</div>
                  <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{trimestre}</div>
                </div>
                <Link href="/solicitudes" style={{ fontSize: 10, color: accent, textDecoration: 'none', fontWeight: 500 }}>Ver todas →</Link>
              </div>
              {actsFiltradas.slice(0, 7).map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${border}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: ESTADO_COLORS[a.estado] || t3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
                    <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{a.area_ref} · {a.responsable_ref} · {a.mes}</div>
                  </div>
                  <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 9, fontFamily: 'DM Mono', background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {a.estado}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', transition: 'background .3s' }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>Tareas por miembro</div>
                <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{trimestre}</div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {datosPorMiembro.map((m, i) => (
                  <div key={m.ref}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono', width: 12 }}>{i + 1}</span>
                        <span style={{ fontSize: 11, color: t1, fontWeight: 500 }}>{m.nombre}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, color: '#34D399', fontFamily: 'DM Mono' }}>{m.completadas}✓</span>
                        <span style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono' }}>{m.horas}h</span>
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${(m.total / maxMiembro) * 100}%`, transition: 'width .5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
