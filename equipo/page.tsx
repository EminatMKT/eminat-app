'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EquipoPage() {
  const [equipo, setEquipo] = useState<any[]>([])
  const [marcaciones, setMarcaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('*, departamentos(nombre, color)')
        .eq('activo', true)
        .order('nombre')

      const { data: hoy } = await supabase
        .from('v_equipo_hoy')
        .select('*')

      setEquipo(usuarios || [])
      setMarcaciones(hoy || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const ROL_LABEL: any = {
    superadmin: 'Superadmin', coordinador: 'Coordinador',
    colaborador: 'Colaborador', pasante: 'Pasante', externo: 'Externo'
  }

  const getMarcacion = (userId: string) =>
    marcaciones.find(m => m.id === userId)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando equipo...</div>
    </div>
  )

  const presentes = marcaciones.filter(m => m.estado_hoy === 'presente').length
  const total = equipo.filter(u => u.marca_hora).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '24px 36px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            ← Dashboard
          </Link>
          <h1 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>Equipo</h1>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>Estado del equipo en tiempo real</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#34D399' }}>{presentes}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Presentes hoy</div>
          </div>
          <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: 'var(--t2)' }}>{equipo.length}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Total equipo</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 36px' }}>
        {/* Grid equipo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {equipo.map(u => {
            const marc = getMarcacion(u.id)
            const presente = marc?.estado_hoy === 'presente'
            const salio = marc?.estado_hoy === 'salio'
            return (
              <div key={u.id} style={{
                background: 'var(--s1)', border: `1px solid ${presente ? 'rgba(52,211,153,.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 16, padding: 24, transition: 'all .2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', background: u.color || '#7C6FF7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0
                    }}>
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </div>
                    {presente && (
                      <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: '#34D399', border: '2px solid var(--s1)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{u.nombre} {u.apellido}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{u.email}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'DM Mono', background: 'rgba(124,111,247,.1)', color: '#7C6FF7' }}>
                        {ROL_LABEL[u.rol]}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'DM Mono', background: 'rgba(255,255,255,.06)', color: 'var(--t3)' }}>
                        Tipo {u.tipo_jornada} · {u.horas_dia}h/día
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                  {u.marca_hora ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 3 }}>Estado hoy</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                          {presente ? (
                            <>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                              <span style={{ color: '#34D399' }}>Presente</span>
                            </>
                          ) : salio ? (
                            <>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FBB040', display: 'inline-block' }} />
                              <span style={{ color: '#FBB040' }}>Salió</span>
                            </>
                          ) : (
                            <>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)', display: 'inline-block' }} />
                              <span style={{ color: 'var(--t3)' }}>Sin registrar</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {marc?.hora_entrada && (
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                            Entrada: <span style={{ color: 'var(--t2)', fontFamily: 'DM Mono' }}>{marc.hora_entrada?.slice(11, 16)}</span>
                          </div>
                        )}
                        {marc?.hora_salida && (
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                            Salida: <span style={{ color: 'var(--t2)', fontFamily: 'DM Mono' }}>{marc.hora_salida?.slice(11, 16)}</span>
                          </div>
                        )}
                        {marc?.horas_trabajadas && (
                          <div style={{ fontSize: 11, color: '#34D399', fontFamily: 'DM Mono', marginTop: 2 }}>
                            {Number(marc.horas_trabajadas).toFixed(1)}h trabajadas
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--t3)', fontStyle: 'italic' }}>
                      Sin marcación de horario (pasante)
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
