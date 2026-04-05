'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then(mod => mod.Player),
  { ssr: false }
)

const ZONAS = [
  { ciudad: 'Ecuador', zona: 'America/Guayaquil', emoji: '🇪🇨' },
  { ciudad: 'Miami', zona: 'America/New_York', emoji: '🇺🇸' },
  { ciudad: 'España', zona: 'Europe/Madrid', emoji: '🇪🇸' },
  { ciudad: 'Panamá', zona: 'America/Panama', emoji: '🇵🇦' },
  { ciudad: 'Chile', zona: 'America/Santiago', emoji: '🇨🇱' },
  { ciudad: 'Argentina', zona: 'America/Argentina/Buenos_Aires', emoji: '🇦🇷' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [sent, setSent] = useState(false)
  const [horas, setHoras] = useState<string[]>([])
  const router = useRouter()

  const DOMINIOS_VALIDOS = ['@eminat.net', '@emc.health', '@vivinegretefoundation.org']

  function emailValido(e: string) {
    return DOMINIOS_VALIDOS.some(d => e.toLowerCase().endsWith(d))
  }

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date()
      setHoras(ZONAS.map(z =>
        ahora.toLocaleTimeString('es-EC', { timeZone: z.zona, hour: '2-digit', minute: '2-digit', hour12: false })
      ))
    }
    actualizar()
    const intervalo = setInterval(actualizar, 1000)
    return () => clearInterval(intervalo)
  }, [])

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
      options: { data: { nombre, apellido } }
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!emailValido(email)) {
      setError('Solo se permiten emails corporativos del Holding Eminat')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) {
      setError('Error al enviar el email. Intenta de nuevo.')
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
          <div style={{ fontSize: 48, marginBottom: 24 }}>
            {mode === 'reset' ? '📧' : '📨'}
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
            {mode === 'reset' ? 'Email enviado' : 'Solicitud enviada'}
          </h2>
          <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: 24 }}>
            {mode === 'reset'
              ? 'Revisa tu bandeja de entrada — te enviamos un link para restablecer tu contraseña.'
              : 'Tu cuenta está pendiente de validación por el Superadmin (Freddy Crespín). Recibirás un email cuando tu acceso sea aprobado.'}
          </p>
          <button
            onClick={() => { setSent(false); setMode('login') }}
            style={{ color: '#7C6FF7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            ← Volver al login
          </button>
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

        {/* Gatito Lottie */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Player
            autoplay
            loop
            src="/gatito.json"
            style={{ height: 200, width: 200 }}
          />
          <h2 style={{ fontFamily: 'Syne', fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: '-.04em', marginBottom: 16, textAlign: 'center' }}>
            El sistema<br />del holding<br />
            <span style={{ color: '#7C6FF7' }}>Eminat.</span>
          </h2>
          <p style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.65, maxWidth: 340, textAlign: 'center' }}>
            Accede con tu email corporativo para gestionar solicitudes, ver el estado de producción y coordinar con el equipo.
          </p>
        </div>

        {/* Relojes y dominios */}
        <div>
          <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--t3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Hora mundial
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {ZONAS.map((z, i) => (
              <div key={z.ciudad} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>{z.emoji}</span>
                <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--t3)', width: 72 }}>{z.ciudad}</span>
                <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: '#7C6FF7', fontWeight: 600 }}>
                  {horas[i] || '--:--'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--t3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Dominios autorizados
          </div>
          {['@eminat.net → Research', '@emc.health → Medical', '@vivinegretefoundation.org → Foundation'].map(d => (
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

          {mode !== 'reset' && (
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
          )}

          {mode === 'reset' && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Recuperar contraseña</h3>
              <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>
                Ingresa tu email corporativo y te enviaremos un link para restablecer tu contraseña.
              </p>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset}>
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

            {mode !== 'reset' && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Contraseña</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={8}
                  style={{ width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none' }}
                />
              </div>
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

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
              {loading ? 'Procesando...' :
                mode === 'login' ? 'Iniciar sesión →' :
                mode === 'register' ? 'Solicitar acceso →' :
                'Enviar link de recuperación →'}
            </button>
          </form>

          {mode === 'register' && (
            <p style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              Tu cuenta será validada por el administrador antes de activarse.
            </p>
          )}

          {mode === 'reset' && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={() => { setMode('login'); setError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans' }}
              >
                ← Volver al login
              </button>
            </div>
          )}

          {mode !== 'reset' && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link href="/" style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none' }}>← Volver al inicio</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
