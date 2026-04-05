'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [dominios, setDominios] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, activos: 0, pendientes: 0, departamentos: 4 })
  const [loading, setLoading] = useState(true)
  const [usuarioActual, setUsuarioActual] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
      if (usr?.rol !== 'superadmin') { router.push('/dashboard'); return }
      setUsuarioActual(usr)

      const { data: usrs } = await supabase
        .from('usuarios')
        .select('*, departamentos(nombre, color)')
        .order('created_at', { ascending: false })

      setUsuarios(usrs || [])

      const { data: doms } = await supabase
        .from('dominios_corporativos')
        .select('*, departamentos(nombre)')

      setDominios(doms || [])

      setStats({
        total: usrs?.length || 0,
        activos: usrs?.filter(u => u.activo && u.validado).length || 0,
        pendientes: usrs?.filter(u => !u.validado).length || 0,
        departamentos: 4
      })

      setLoading(false)
    }
    cargar()
  }, [])

  async function validarUsuario(id: string) {
    await supabase.from('usuarios').update({
      validado: true, activo: true, validado_por: usuarioActual?.id, validado_en: new Date().toISOString()
    }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, validado: true, activo: true } : u))
  }

  async function rechazarUsuario(id: string) {
    await supabase.from('usuarios').update({ activo: false }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: false } : u))
  }

  const ROL_COLORS: any = {
    superadmin: { bg: 'rgba(248,113,113,.12)', color: '#F87171' },
    coordinador: { bg: 'rgba(124,111,247,.1)', color: '#7C6FF7' },
    colaborador: { bg: 'rgba(52,211,153,.1)', color: '#34D399' },
    pasante: { bg: 'rgba(251,176,64,.1)', color: '#FBB040' },
    externo: { bg: 'rgba(148,148,179,.1)', color: '#9494B3' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando panel admin...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 240, background: 'var(--s1)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', boxShadow: '0 0 10px #F87171' }} />
            Super Admin
          </div>
        </div>
        <nav style={{ padding: '14px 10px', flex: 1 }}>
          {[
            { icon: '👥', label: 'Usuarios', active: true },
            { icon: '🏢', label: 'Departamentos' },
            { icon: '📧', label: 'Dominios' },
            { icon: '🔐', label: 'Permisos' },
            { icon: '📊', label: 'Métricas globales' },
            { icon: '⚙️', label: 'Configuración' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 10, fontSize: 13, fontWeight: 500,
              color: item.active ? '#F87171' : 'var(--t2)',
              background: item.active ? 'rgba(248,113,113,.08)' : 'transparent',
              cursor: 'pointer', marginBottom: 1
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexDirection: 'column' }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none' }}>← Volver al Dashboard</Link>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', padding: '30px 36px' }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 4 }}>
          Panel de administración
        </h1>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 28 }}>
          Gestiona usuarios, roles y acceso por departamento en el Holding Eminat
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Usuarios totales', value: stats.total, color: '#7C6FF7' },
            { label: 'Activos', value: stats.activos, color: '#34D399' },
            { label: 'Pendientes validar', value: stats.pendientes, color: '#FBB040' },
            { label: 'Departamentos', value: stats.departamentos, color: '#60A5FA' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla de usuarios */}
        <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Usuarios del sistema</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Holding Eminat — todos los miembros</div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--s2)' }}>
                  {['Usuario', 'Email', 'Departamento', 'Rol', 'Jornada', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 400 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color || '#7C6FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {u.nombre?.[0]}{u.apellido?.[0]}
                        </div>
                        <span style={{ fontSize: 13 }}>{u.nombre} {u.apellido}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', color: 'var(--t3)', fontSize: 12, fontFamily: 'DM Mono' }}>{u.email}</td>
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, border: '1px solid rgba(255,255,255,0.13)', color: 'var(--t2)' }}>
                        {u.departamentos?.nombre || 'Sin asignar'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'DM Mono', ...ROL_COLORS[u.rol] }}>
                        {u.rol}
                      </span>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 11, fontFamily: 'DM Mono', color: 'var(--t3)' }}>
                      Tipo {u.tipo_jornada} · {u.horas_dia}h
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      {u.validado && u.activo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#34D399' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                          Activo
                        </div>
                      ) : !u.validado ? (
                        <span style={{ fontSize: 11, color: '#FBB040', fontFamily: 'DM Mono' }}>Pendiente</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#F87171' }}>Inactivo</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!u.validado && (
                          <button onClick={() => validarUsuario(u.id)} style={{
                            padding: '5px 12px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(52,211,153,.3)',
                            background: 'transparent', color: '#34D399', cursor: 'pointer', fontFamily: 'DM Sans'
                          }}>✓ Validar</button>
                        )}
                        {u.activo && u.rol !== 'superadmin' && (
                          <button onClick={() => rechazarUsuario(u.id)} style={{
                            padding: '5px 12px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(248,113,113,.3)',
                            background: 'transparent', color: '#F87171', cursor: 'pointer', fontFamily: 'DM Sans'
                          }}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dominios */}
        <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Dominios corporativos autorizados</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>El sistema asigna departamento automáticamente según el email</div>
          </div>
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {dominios.map(d => (
              <div key={d.id} style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: '#7C6FF7', marginBottom: 8 }}>{d.dominio}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Departamento → {d.departamentos?.nombre}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                  Clock-in: {d.clock_in_activo ? '✅ Activo' : '❌ No'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
