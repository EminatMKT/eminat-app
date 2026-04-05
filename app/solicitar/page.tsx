'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const AREAS = [
  { codigo: 'EMC', nombre: 'Medical Center', color: '#60A5FA' },
  { codigo: 'SVN', nombre: 'Soy Vivi Negrete', color: '#F472B6' },
  { codigo: 'ERG', nombre: 'Research Group', color: '#A78BFA' },
  { codigo: 'VNF', nombre: 'Foundation', color: '#FB923C' },
  { codigo: 'PREMIER', nombre: 'Premier', color: '#34D399' },
]

const ENTREGABLES = [
  'Post Instagram (1:1)', 'Story Instagram (9:16)', 'Reel / Video corto',
  'Banner web horizontal', 'Infografía', 'Presentación',
  'Manual de marca', 'Documento / PDF', 'Animación', 'Otro'
]

export default function SolicitarPage() {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [area, setArea] = useState('EMC')
  const [prioridad, setPrioridad] = useState('media')
  const [entregable, setEntregable] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [emailSolicitante, setEmailSolicitante] = useState('')
  const [nombreSolicitante, setNombreSolicitante] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState<any>(null)
  const [error, setError] = useState('')
  const [cola, setCola] = useState<any[]>([])

  useEffect(() => {
    async function cargarCola() {
      const { data } = await supabase
        .from('solicitudes')
        .select('*')
        .in('estado', ['recibida', 'asignada', 'en_proceso'])
        .order('created_at', { ascending: false })
        .limit(5)
      setCola(data || [])
    }
    cargarCola()

    // Verificar si hay sesión activa
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmailSolicitante(user.email || '')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: areaData } = await supabase.from('areas').select('id').eq('codigo', area).single()

    const { data, error: err } = await supabase
      .from('solicitudes')
      .insert({
        titulo,
        descripcion,
        area_id: areaData?.id,
        prioridad,
        tipo_entregable: entregable,
        fecha_requerida: fechaLimite || null,
        email_solicitante: emailSolicitante,
        nombre_solicitante: nombreSolicitante,
        estado: 'recibida',
        departamento_destino: 'marketing'
      })
      .select()
      .single()

    if (err) {
      setError('Error al enviar la solicitud. Intenta de nuevo.')
      setLoading(false)
      return
    }

    setEnviado(data)
    setLoading(false)
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 40 }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>✅</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
            Solicitud enviada
          </h2>
          <div style={{
            display: 'inline-block', padding: '6px 16px', borderRadius: 20,
            background: 'rgba(124,111,247,0.14)', color: '#7C6FF7',
            fontFamily: 'DM Mono', fontSize: 13, marginBottom: 20
          }}>
            SOL-{String(enviado.numero).padStart(3, '0')}
          </div>
          <p style={{ color: 'var(--t2)', lineHeight: 1.65, marginBottom: 32 }}>
            Tu solicitud <strong style={{ color: 'var(--t1)' }}>"{enviado.titulo}"</strong> fue recibida con prioridad <strong style={{ color: 'var(--t1)' }}>{prioridad}</strong>. El equipo de Freddy la revisará pronto.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setEnviado(null); setTitulo(''); setDescripcion('') }} style={{
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: '#7C6FF7', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans'
            }}>Nueva solicitud</button>
            <Link href="/" style={{
              padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.13)',
              color: 'var(--t2)', fontSize: 14, textDecoration: 'none', display: 'inline-block'
            }}>← Inicio</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      {/* FORM */}
      <div style={{ flex: 1, padding: '56px 60px', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 580 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C6FF7' }} />
            <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'DM Mono' }}>eminat app · nueva solicitud</span>
          </div>

          <h1 style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', marginBottom: 8 }}>
            Hacer una solicitud
          </h1>
          <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 36 }}>
            Cuéntanos qué necesitas y el equipo de producción lo tomará desde aquí.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Título de la solicitud *</label>
              <input
                value={titulo} onChange={e => setTitulo(e.target.value)} required
                placeholder="Ej: Banner Instagram para campaña de Abril"
                style={{ width: '100%', padding: '11px 15px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Descripción detallada *</label>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Mientras más detalle des, mejor será el resultado.</div>
              <textarea
                value={descripcion} onChange={e => setDescripcion(e.target.value)} required
                rows={5}
                placeholder="¿Qué tipo de pieza? ¿Para qué canal? ¿Tienes referencias? ¿Cuál es el mensaje principal?"
                style={{ width: '100%', padding: '11px 15px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>¿Para qué marca?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {AREAS.map(a => (
                  <div key={a.codigo} onClick={() => setArea(a.codigo)} style={{
                    padding: 12, borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                    border: `1px solid ${area === a.codigo ? a.color : 'rgba(255,255,255,0.13)'}`,
                    background: area === a.codigo ? `${a.color}18` : 'var(--s2)',
                    transition: 'all .2s'
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 10, fontWeight: 600 }}>{a.codigo}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Prioridad</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'baja', label: 'Baja', color: '#34D399' },
                  { value: 'media', label: 'Media', color: '#FBB040' },
                  { value: 'alta', label: 'Alta', color: '#F87171' },
                  { value: 'urgente', label: 'Urgente', color: '#EF4444' },
                ].map(p => (
                  <div key={p.value} onClick={() => setPrioridad(p.value)} style={{
                    flex: 1, padding: 10, borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    border: `1px solid ${prioridad === p.value ? p.color : 'rgba(255,255,255,0.13)'}`,
                    background: prioridad === p.value ? `${p.color}18` : 'var(--s2)',
                    color: prioridad === p.value ? p.color : 'var(--t2)',
                    transition: 'all .2s'
                  }}>{p.label}</div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Tipo de entregable</label>
                <select value={entregable} onChange={e => setEntregable(e.target.value)} style={{
                  width: '100%', padding: '11px 15px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 10, color: entregable ? 'var(--t1)' : 'var(--t3)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none', appearance: 'none'
                }}>
                  <option value="">Seleccionar...</option>
                  {ENTREGABLES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Fecha límite</label>
                <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} style={{
                  width: '100%', padding: '11px 15px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none'
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Tu nombre</label>
                <input value={nombreSolicitante} onChange={e => setNombreSolicitante(e.target.value)} placeholder="Javier Andrade" style={{
                  width: '100%', padding: '11px 15px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Tu email</label>
                <input type="email" value={emailSolicitante} onChange={e => setEmailSolicitante(e.target.value)} placeholder="tu@emc.health" style={{
                  width: '100%', padding: '11px 15px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none'
                }} />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#F87171', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button type="submit" disabled={loading} style={{
                padding: '14px 32px', borderRadius: 12, border: 'none', background: '#7C6FF7',
                color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? .7 : 1, fontFamily: 'DM Sans'
              }}>
                {loading ? 'Enviando...' : 'Enviar solicitud →'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>Respuesta en menos de 24h hábiles</span>
            </div>
          </form>
        </div>
      </div>

      {/* QUEUE */}
      <div style={{ width: 320, padding: '56px 32px', background: 'var(--s1)' }}>
        <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Estado de la cola</div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 24 }}>Producción activa ahora</div>

        <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Solicitudes activas</div>
          <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#7C6FF7' }}>{cola.length}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Tu solicitud entraría como #{cola.length + 1}</div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '20px 0' }} />

        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>
          Solicitudes recientes
        </div>

        {cola.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', padding: '20px 0' }}>Sin solicitudes activas</div>
        ) : cola.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 12 }}>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--t3)', width: 24 }}>#{String(i + 1).padStart(2, '0')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{s.titulo?.slice(0, 30)}{s.titulo?.length > 30 ? '...' : ''}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>{s.estado}</div>
            </div>
          </div>
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '20px 0' }} />

        <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>¿Urgente?</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 10 }}>
            Escríbele directamente a Freddy con el código <code style={{ fontFamily: 'DM Mono', background: 'var(--s3)', padding: '2px 5px', borderRadius: 4 }}>URGENTE</code>
          </div>
          <div style={{ fontSize: 11, color: '#7C6FF7' }}>freddy@eminat.net</div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none' }}>← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
