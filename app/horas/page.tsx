'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HorasPage() {
  const [marcaciones, setMarcaciones] = useState<any[]>([])
  const [usuario, setUsuario] = useState<any>(null)
  const [filtroUsuario, setFiltroUsuario] = useState('todos')
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
      setUsuario(usr)

      const { data: marcs } = await supabase
        .from('marcaciones')
        .select('*, usuarios(nombre, apellido, color, tipo_jornada, horas_dia, id_sheet)')
        .order('fecha', { ascending: false })
        .limit(200)

      const { data: usrs } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, color, tipo_jornada, horas_dia, marca_hora, id_sheet')
        .eq('activo', true)
        .eq('marca_hora', true)

      setMarcaciones(marcs || [])
      setUsuarios(usrs || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const filtradas = filtroUsuario === 'todos'
    ? marcaciones
    : marcaciones.filter(m => m.usuario_id === filtroUsuario)

  const totalHoras = filtradas.reduce((acc, m) => acc + (Number(m.horas_trabajadas) || 0), 0)
  const diasConRegistro = filtradas.filter(m => m.hora_entrada).length
  const promedioDiario = diasConRegistro > 0 ? totalHoras / diasConRegistro : 0

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando horas...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '24px 36px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none', marginBottom: 8, display: 'block' }}>← Dashboard</Link>
          <h1 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>Control de Horas</h1>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>Registro de marcaciones del equipo</p>
        </div>
        <Link href="/clockin" style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7C6FF7',
          color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none'
        }}>⏰ Clock-in</Link>
      </div>

      <div style={{ padding: '24px 36px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total horas', value: `${totalHoras.toFixed(1)}h`, color: '#7C6FF7' },
            { label: 'Días con registro', value: diasConRegistro, color: '#34D399' },
            { label: 'Promedio diario', value: `${promedioDiario.toFixed(1)}h`, color: '#FBB040' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'DM Mono', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Resumen por colaborador */}
        <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Resumen por colaborador</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {usuarios.map(u => {
              const marcsUsuario = marcaciones.filter(m => m.usuario_id === u.id)
              const horasTotal = marcsUsuario.reduce((acc, m) => acc + (Number(m.horas_trabajadas) || 0), 0)
              const diasRegistrados = marcsUsuario.filter(m => m.hora_entrada).length
              return (
                <div key={u.id} style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || '#7C6FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{u.nombre}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>Tipo {u.tipo_jornada} · {u.horas_dia}h/día</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t3)' }}>
                    <span>{diasRegistrados} días</span>
                    <span style={{ color: '#34D399', fontFamily: 'DM Mono', fontWeight: 600 }}>{horasTotal.toFixed(1)}h</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filtro y tabla */}
        <div style={{ marginBottom: 14 }}>
          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} style={{
            padding: '9px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
            borderRadius: 10, color: 'var(--t1)', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', appearance: 'none'
          }}>
            <option value="todos">Todos los colaboradores</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
          </select>
        </div>

        <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--s2)' }}>
                {['Colaborador', 'Fecha', 'Entrada', 'Salida', 'Horas trabajadas', 'Tipo'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.usuarios?.color || '#7C6FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                        {m.usuarios?.nombre?.[0]}{m.usuarios?.apellido?.[0]}
                      </div>
                      <span style={{ fontSize: 13 }}>{m.usuarios?.nombre} {m.usuarios?.apellido}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'DM Mono', fontSize: 12 }}>{m.fecha}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'DM Mono', fontSize: 12, color: '#34D399' }}>
                    {m.hora_entrada ? m.hora_entrada.slice(11, 16) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'DM Mono', fontSize: 12, color: '#F87171' }}>
                    {m.hora_salida ? m.hora_salida.slice(11, 16) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'DM Mono', fontSize: 13, fontWeight: 600, color: m.horas_trabajadas ? '#34D399' : 'var(--t3)' }}>
                    {m.horas_trabajadas ? `${Number(m.horas_trabajadas).toFixed(1)}h` : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'DM Mono', background: 'rgba(255,255,255,.06)', color: 'var(--t3)' }}>
                      {m.tipo || 'normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: 13 }}>
              No hay registros de horario aún
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
