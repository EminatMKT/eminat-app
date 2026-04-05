'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ClockinPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [marcacion, setMarcacion] = useState<any>(null)
  const [equipo, setEquipo] = useState<any[]>([])
  const [hora, setHora] = useState('')
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
      setUsuario(usr)

      if (usr) {
        const { data: marc } = await supabase
          .from('marcaciones')
          .select('*')
          .eq('usuario_id', usr.id)
          .eq('fecha', new Date().toISOString().split('T')[0])
          .single()
        setMarcacion(marc)
      }

      const { data: team } = await supabase.from('v_equipo_hoy').select('*')
      setEquipo(team || [])
      setLoading(false)
    }
    cargar()

    const timer = setInterval(() => {
      const now = new Date()
      setHora(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function registrarEntrada() {
    if (!usuario?.marca_hora) return
    setProcesando(true)
    const { data } = await supabase.rpc('registrar_entrada', { p_usuario_id: usuario.id })
    const { data: marc } = await supabase
      .from('marcaciones')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('fecha', new Date().toISOString().split('T')[0])
      .single()
    setMarcacion(marc)
    const { data: team } = await supabase.from('v_equipo_hoy').select('*')
    setEquipo(team || [])
    setProcesando(false)
  }

  async function registrarSalida() {
    if (!usuario?.marca_hora) return
    setProcesando(true)
    await supabase.rpc('registrar_salida', { p_usuario_id: usuario.id })
    const { data: marc } = await supabase
      .from('marcaciones')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('fecha', new Date().toISOString().split('T')[0])
      .single()
    setMarcacion(marc)
    setProcesando(false)
  }

  const presente = marcacion?.hora_entrada && !marcacion?.hora_salida
  const salio = marcacion?.hora_entrada && marcacion?.hora_salida

  const fechaHoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '20px 36px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 36px', gap: 48 }}>
        {/* Reloj */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: 72, fontWeight: 400, letterSpacing: '-.03em', lineHeight: 1 }}>{hora}</div>
          <div style={{ fontSize: 15, color: 'var(--t2)', marginTop: 10, textTransform: 'capitalize' }}>{fechaHoy}</div>
        </div>

        {/* Usuario y acción */}
        <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 4 }}>
            {usuario?.nombre} {usuario?.apellido}
          </div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>
            {usuario?.rol} · Jornada Tipo {usuario?.tipo_jornada} · {usuario?.horas_dia}h/día
          </div>

          {!usuario?.marca_hora ? (
            <div style={{ background: 'rgba(251,176,64,.1)', border: '1px solid rgba(251,176,64,.2)', borderRadius: 12, padding: '16px 20px', fontSize: 13, color: '#FBB040' }}>
              Los pasantes no registran marcación de horario
            </div>
          ) : presente ? (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 100, border: '1px solid rgba(52,211,153,.3)', background: 'rgba(52,211,153,.08)', color: '#34D399', fontSize: 14, fontWeight: 500, marginBottom: 20 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                Turno activo — entrada registrada a las {marcacion.hora_entrada?.slice(11, 16)}
              </div>
              <button onClick={registrarSalida} disabled={procesando} style={{
                display: 'block', width: '100%', padding: 16, borderRadius: 14, border: 'none',
                background: '#F87171', color: 'white', fontFamily: 'Syne', fontSize: 16, fontWeight: 700,
                cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? .7 : 1
              }}>
                {procesando ? 'Registrando...' : 'Registrar salida →'}
              </button>
            </>
          ) : salio ? (
            <div style={{ background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ fontSize: 13, color: '#34D399', fontWeight: 600, marginBottom: 8 }}>✅ Jornada completada</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                Entrada: {marcacion.hora_entrada?.slice(11, 16)} · Salida: {marcacion.hora_salida?.slice(11, 16)}
              </div>
              {marcacion.horas_trabajadas && (
                <div style={{ fontSize: 20, fontFamily: 'Syne', fontWeight: 800, color: '#34D399', marginTop: 8 }}>
                  {Number(marcacion.horas_trabajadas).toFixed(1)}h trabajadas
                </div>
              )}
            </div>
          ) : (
            <button onClick={registrarEntrada} disabled={procesando} style={{
              display: 'block', width: '100%', padding: 16, borderRadius: 14, border: 'none',
              background: '#7C6FF7', color: 'white', fontFamily: 'Syne', fontSize: 16, fontWeight: 700,
              cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? .7 : 1
            }}>
              {procesando ? 'Registrando...' : 'Registrar entrada →'}
            </button>
          )}
        </div>

        {/* Estado del equipo */}
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14, textAlign: 'center' }}>
            Estado del equipo hoy
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {equipo.map(u => (
              <div key={u.id} style={{
                background: u.estado_hoy === 'presente' ? 'rgba(52,211,153,.06)' : 'var(--s1)',
                border: `1px solid ${u.estado_hoy === 'presente' ? 'rgba(52,211,153,.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 12, padding: '14px 10px', textAlign: 'center'
              }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.color || '#7C6FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                    {u.nombre?.[0]}{u.apellido?.[0]}
                  </div>
                  {u.estado_hoy === 'presente' && (
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#34D399', border: '2px solid var(--bg)' }} />
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{u.nombre}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                  {u.estado_hoy === 'presente' ? u.hora_entrada?.slice(11, 16) :
                   u.estado_hoy === 'salio' ? 'Salió' :
                   u.estado_hoy === 'sin_marcacion' ? 'Pasante' : 'Sin registrar'}
                </div>
                {u.estado_hoy === 'presente' && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 9, background: 'rgba(52,211,153,.14)', color: '#34D399', fontFamily: 'DM Mono' }}>PRESENTE</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--t3)' }}>
            {equipo.filter(u => u.estado_hoy === 'presente').length}/{equipo.filter(u => u.marca_hora !== false).length} colaboradores presentes
          </div>
        </div>
      </div>
    </div>
  )
}
