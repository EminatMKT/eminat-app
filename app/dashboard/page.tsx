'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [equipo, setEquipo] = useState<any[]>([])
  const [kpis, setKpis] = useState({ total: 0, completadas: 0, porAprobar: 0, enProceso: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    cargarDashboard()
  }, [])

  async function cargarDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: usr } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', user.email)
      .single()

    setUsuario(usr)

    const { data: acts } = await supabase
      .from('actividades')
      .select('*, areas(*)')
      .order('created_at', { ascending: false })
      .limit(10)

    setActividades(acts || [])

    const { data: team } = await supabase
      .from('v_equipo_hoy')
      .select('*')

    setEquipo(team || [])

    const { data: stats } = await supabase
      .from('actividades')
      .select('estado')

    if (stats) {
      setKpis({
        total: stats.length,
        completadas: stats.filter(a => a.estado === 'Completado').length,
        porAprobar: stats.filter(a => a.estado === 'Por aprobar').length,
        enProceso: stats.filter(a => a.estado === 'En proceso').length,
      })
    }

    setLoading(false)
  }

  async function handleLogout() {
    if (usuario?.id && usuario?.marca_hora) {
      await supabase.rpc('registrar_salida', { p_usuario_id: usuario.id })
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  const ESTADO_COLORS: any = {
    'Completado': '#34D399', 'Por aprobar': '#FBB040',
    'En proceso': '#7C6FF7', 'Pendiente': '#9494B3'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 224, background: 'var(--s1)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C6FF7', boxShadow: '0 0 10px #7C6FF7' }} />
            eminat app
          </div>
        </div>

        <nav style={{ padding: '14px 10px', flex: 1 }}>
          {[
            { icon: '📊', label: 'Dashboard', href: '/dashboard', active: true },
            { icon: '📋', label: 'Solicitudes', href: '/solicitudes' },
            { icon: '📅', label: 'Calendario', href: '/calendario' },
            { icon: '👥', label: 'Equipo', href: '/equipo' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              color: item.active ? '#7C6FF7' : 'var(--t2)',
              background: item.active ? 'rgba(124,111,247,0.14)' : 'transparent',
              marginBottom: 1
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.12em', padding: '14px 8px 6px' }}>Reportes</div>
          {[
            { icon: '📈', label: 'Producción', href: '/produccion' },
            { icon: '⏱️', label: 'Horas', href: '/horas' },
            { icon: '💰', label: 'Pagos', href: '/pagos' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              color: 'var(--t2)', marginBottom: 1
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.12em', padding: '14px 8px 6px' }}>Marcas</div>
          {[
            { codigo: 'EMC', color: '#60A5FA' },
            { codigo: 'SVN', color: '#F472B6' },
            { codigo: 'ERG', color: '#A78BFA' },
            { codigo: 'VNF', color: '#FB923C' },
            { codigo: 'PREMIER', color: '#34D399' },
          ].map(a => (
            <div key={a.codigo} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 10, fontSize: 13, color: 'var(--t2)', cursor: 'pointer', marginBottom: 1
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
              {a.codigo}
            </div>
          ))}
        </nav>

        <div style={{
          padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: usuario?.color || '#7C6FF7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0
          }}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{usuario?.nombre}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)' }}>{usuario?.rol}</div>
          </div>
          <button onClick={handleLogout} style={{
            background: 'transparent', border: 'none', color: 'var(--t3)',
            fontSize: 16, cursor: 'pointer', padding: 4
          }} title="Cerrar sesión">↩</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {/* Topbar */}
        <div style={{
          padding: '18px 30px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--s1)', position: 'sticky', top: 0, zIndex: 10
        }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17 }}>
              Buen día, {usuario?.nombre} 👋
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'DM Mono', marginTop: 2 }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador') && (
              <Link href="/admin" style={{
                padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(248,113,113,.3)',
                background: 'rgba(248,113,113,.08)', color: '#F87171', fontSize: 12, fontWeight: 500,
                textDecoration: 'none'
              }}>🔐 Admin</Link>
            )}
            <Link href="/solicitar" style={{
              padding: '8px 18px', borderRadius: 10, border: 'none',
              background: '#7C6FF7', color: 'white', fontSize: 13, fontWeight: 600,
              textDecoration: 'none'
            }}>+ Nueva solicitud</Link>
          </div>
        </div>

        <div style={{ padding: '26px 30px' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Tareas', value: kpis.total, color: '#7C6FF7' },
              { label: 'Por Aprobar', value: kpis.porAprobar, color: '#FBB040' },
              { label: 'Completadas', value: kpis.completadas, color: '#34D399' },
              { label: 'En Proceso', value: kpis.enProceso, color: 'var(--t2)' },
            ].map(k => (
              <div key={k.label} style={{
                background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: 20
              }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, fontFamily: 'DM Mono' }}>
                  {k.label}
                </div>
                <div style={{ fontFamily: 'Syne', fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-.03em', color: k.color }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
            {/* Actividades recientes */}
            <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Actividades recientes</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Últimas 10 del Q1</div>
                </div>
                <Link href="/actividades" style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(255,255,255,0.13)', color: 'var(--t2)', textDecoration: 'none' }}>Ver todas</Link>
              </div>
              {actividades.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer'
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.areas?.color || '#7C6FF7', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{a.titulo}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', gap: 8 }}>
                      <span>{a.area_ref}</span>
                      {a.fecha_entrega && <span>· {a.fecha_entrega}</span>}
                      <span>· {a.responsable_ref}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'DM Mono', fontWeight: 500,
                    background: `${ESTADO_COLORS[a.estado] || '#9494B3'}20`,
                    color: ESTADO_COLORS[a.estado] || '#9494B3'
                  }}>{a.estado}</span>
                </div>
              ))}
            </div>

            {/* Estado del equipo */}
            <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Equipo hoy</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Estado en tiempo real</div>
              </div>
              {equipo.map(u => (
                <div key={u.id} style={{
                  padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: u.color || '#7C6FF7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'white'
                    }}>
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </div>
                    {u.estado_hoy === 'presente' && (
                      <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 10, height: 10, borderRadius: '50%', background: '#34D399',
                        border: '2px solid var(--s1)'
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{u.nombre}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                      {u.estado_hoy === 'presente' ? `Entrada: ${u.hora_entrada?.slice(11, 16)}` :
                       u.estado_hoy === 'sin_marcacion' ? 'Sin marcación (pasante)' : 'Sin registrar'}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: u.estado_hoy === 'presente' ? '#34D399' : 'var(--t3)' }}>
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
