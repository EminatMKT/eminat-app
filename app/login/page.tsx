'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [sent, setSent] = useState(false)
  const router = useRouter()

  const DOMINIOS_VALIDOS = ['@eminat.net', '@emc.health', '@vivinegretefoundation.org']

  function emailValido(e: string) {
    return DOMINIOS_VALIDOS.some(d => e.toLowerCase().endsWith(d))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!emailValido(email)) {
      setError('Solo se permiten emails corporativos (@eminat.net, @emc.health, @vivinegretefoundation.org)')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Registrar clock-in automático
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, marca_hora')
        .eq('email', user.email)
        .single()

      if (usuario?.marca_hora) {
        await supabase.rpc('registrar_entrada', { p_usuario_id: usuario.id })
      }
    }

    router.push('/dashboard')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!emailValido(email)) {
      setError('Solo se permiten emails corporativos del Holding Eminat')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido }
      }
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 480, width: '100%', margin: '0 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📨</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Solicitud enviada</h2>
          <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: 24 }}>
            Tu cuenta está pendiente de validación por el Superadmin (Freddy Crespín). Recibirás un email cuando tu acceso sea aprobado.
          </p>
          <Link href="/" style={{ color: '#7C6FF7', textDecoration: 'none', fontSize: 14 }}>← Volver al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* LEFT — Branding */}
      <div style={{
        flex: 1, background: 'var(--s1)', padding: '60px 60px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRight: '1px solid rgba(255,255,255,0.07)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C6FF7', boxShadow: '0 0 10px #7C6FF7' }} />
          eminat app
        </div>

        <div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 48, fontWeight: 800, lineHeight: 1, letterSpacing: '-.04em', marginBottom: 20 }}>
            El sistema<br />del holding<br />
            <span style={{ color: '#7C6FF7' }}>Eminat.</span>
          </h2>
          <p style={{ color: 'var(--t2)', fontSize: 15, lineHeight: 1.65, maxWidth: 380 }}>
            Accede con tu email corporativo para gestionar solicitudes, ver el estado de producción y coordinar con el equipo.
          </p>
        </div>

        <div>
          <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--t3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Dominios autorizados
          </div>
          {['@eminat.net → Marketing', '@emc.health → Medical', '@vivinegretefoundation.org → Foundation'].map(d => (
            <div key={d} style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--t2)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C6FF7', display: 'inline-block' }} />
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 36, background: 'var(--s2)', borderRadius: 12, padding: 4 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                background: mode === m ? 'var(--s3)' : 'transparent',
                color: mode === m ? 'var(--t1)' : 'var(--t3)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'DM Sans', transition: 'all .2s'
              }}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            {mode === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Nombre</label>
                  <input
                    type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Freddy" required
                    style={{ width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Apellido</label>
                  <input
                    type="text" value={apellido} onChange={e => setApellido(e.target.value)}
                    placeholder="Crespín" required
                    style={{ width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Email corporativo</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@eminat.net" required
                style={{ width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={8}
                style={{ width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#F87171', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: '#7C6FF7', color: 'white', fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1,
              fontFamily: 'DM Sans', transition: 'all .2s'
            }}>
              {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión →' : 'Solicitar acceso →'}
            </button>
          </form>

          {mode === 'register' && (
            <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              Tu cuenta será validada por el administrador antes de activarse.
            </p>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link href="/" style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none' }}>← Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
