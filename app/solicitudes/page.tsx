'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
      setUsuario(usr)

      const { data } = await supabase
        .from('solicitudes')
        .select('*, areas(nombre, color, codigo)')
        .order('created_at', { ascending: false })

      setSolicitudes(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  async function actualizarEstado(id: string, estado: string) {
    await supabase.from('solicitudes').update({ estado }).eq('id', id)
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado } : s))
  }

  const ESTADOS = ['todos', 'recibida', 'en_revision', 'asignada', 'en_proceso', 'completada', 'rechazada']
  const ESTADO_COLORS: any = {
    recibida: { bg: 'rgba(124,111,247,.14)', color: '#7C6FF7' },
    en_revision: { bg: 'rgba(251,176,64,.14)', color: '#FBB040' },
    asignada: { bg: 'rgba(45,212,191,.14)', color: '#2DD4BF' },
    en_proceso: { bg: 'rgba(96,165,250,.14)', color: '#60A5FA' },
    completada: { bg: 'rgba(52,211,153,.14)', color: '#34D399' },
    rechazada: { bg: 'rgba(248,113,113,.14)', color: '#F87171' },
    cancelada: { bg: 'rgba(148,148,179,.14)', color: '#9494B3' },
  }

  const PRIORIDAD_COLORS: any = {
    baja: '#34D399', media: '#FBB040', alta: '#F87171', urgente: '#EF4444'
  }

  const filtradas = filtro === 'todos' ? solicitudes : solicitudes.filter(s => s.estado === filtro)

  const stats = {
    total: solicitudes.length,
    recibidas: solicitudes.filter(s => s.estado === 'recibida').length,
    en_proceso: solicitudes.filter(s => s.estado === 'en_proceso').length,
    completadas: solicitudes.filter(s => s.estado === 'completada').length,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando solicitudes...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '24px 36px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none', marginBottom: 8, display: 'block' }}>← Dashboard</Link>
          <h1 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>Solicitudes</h1>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>Gestiona las solicitudes de producción</p>
        </div>
        <Link href="/solicitar" style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7C6FF7',
          color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none'
        }}>+ Nueva solicitud</Link>
      </div>

      <div style={{ padding: '24px 36px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: '#7C6FF7' },
            { label: 'Recibidas', value: stats.recibidas, color: '#FBB040' },
            { label: 'En proceso', value: stats.en_proceso, color: '#60A5FA' },
            { label: 'Completadas', value: stats.completadas, color: '#34D399' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'DM Mono', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {ESTADOS.map(e => (
            <button key={e} onClick={() => setFiltro(e)} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid',
              borderColor: filtro === e ? '#7C6FF7' : 'rgba(255,255,255,0.13)',
              background: filtro === e ? 'rgba(124,111,247,.14)' : 'transparent',
              color: filtro === e ? '#7C6FF7' : 'var(--t2)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans',
              textTransform: 'capitalize'
            }}>
              {e === 'todos' ? 'Todas' : e.replace('_', ' ')}
              {e !== 'todos' && (
                <span style={{ marginLeft: 6, background: 'rgba(255,255,255,.1)', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                  {solicitudes.filter(s => s.estado === e).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          {filtradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div>No hay solicitudes en esta categoría</div>
            </div>
          ) : filtradas.map((s, i) => (
            <div key={s.id} style={{
              padding: '16px 20px', borderBottom: i < filtradas.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 14
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.areas?.color || '#7C6FF7', marginTop: 6, flexShrink: 0 }} />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--t3)', marginRight: 8 }}>
                      SOL-{String(s.numero).padStart(3, '0')}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.titulo}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontFamily: 'DM Mono', fontWeight: 500, ...ESTADO_COLORS[s.estado] }}>
                      {s.estado?.replace('_', ' ')}
                    </span>
                    {s.prioridad && (
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontFamily: 'DM Mono', color: PRIORIDAD_COLORS[s.prioridad], background: `${PRIORIDAD_COLORS[s.prioridad]}18` }}>
                        {s.prioridad}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8, lineHeight: 1.5 }}>
                  {s.descripcion?.slice(0, 120)}{s.descripcion?.length > 120 ? '...' : ''}
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--t3)', flexWrap: 'wrap' }}>
                  {s.areas?.codigo && <span>📌 {s.areas.codigo}</span>}
                  {s.tipo_entregable && <span>📄 {s.tipo_entregable}</span>}
                  {s.email_solicitante && <span>✉️ {s.email_solicitante}</span>}
                  {s.fecha_requerida && <span>📅 {s.fecha_requerida}</span>}
                  <span>🕐 {new Date(s.created_at).toLocaleDateString('es-ES')}</span>
                </div>
              </div>

              {(usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {s.estado === 'recibida' && (
                    <button onClick={() => actualizarEstado(s.id, 'en_proceso')} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(96,165,250,.3)',
                      background: 'transparent', color: '#60A5FA', cursor: 'pointer', fontFamily: 'DM Sans'
                    }}>▶ Iniciar</button>
                  )}
                  {s.estado === 'en_proceso' && (
                    <button onClick={() => actualizarEstado(s.id, 'completada')} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(52,211,153,.3)',
                      background: 'transparent', color: '#34D399', cursor: 'pointer', fontFamily: 'DM Sans'
                    }}>✓ Completar</button>
                  )}
                  {!['completada', 'rechazada', 'cancelada'].includes(s.estado) && (
                    <button onClick={() => actualizarEstado(s.id, 'rechazada')} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(248,113,113,.3)',
                      background: 'transparent', color: '#F87171', cursor: 'pointer', fontFamily: 'DM Sans'
                    }}>✕ Rechazar</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
