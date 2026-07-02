'use client'

import { useState, useEffect } from 'react'
import * as auth from '@/shared/db/auth'
import { usuariosRepo } from '@/shared/data'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@/shared/i18n'
import { ROUTES } from '@/shared/auth/permissions'
import { DOMINIOS_VALIDOS } from '@/shared/constants/domain'
import { MARKETING_COORDINATOR_EMAIL } from '@/shared/constants/contacts'

const ZONAS = [
  { ciudad: 'Ecuador', zona: 'America/Guayaquil', emoji: '🇪🇨' },
  { ciudad: 'Miami', zona: 'America/New_York', emoji: '🇺🇸' },
  { ciudad: 'España', zona: 'Europe/Madrid', emoji: '🇪🇸' },
  { ciudad: 'Panama', zona: 'America/Panama', emoji: '🇵🇦' },
  { ciudad: 'Chile', zona: 'America/Santiago', emoji: '🇨🇱' },
  { ciudad: 'Argentina', zona: 'America/Argentina/Buenos_Aires', emoji: '🇦🇷' },
]

async function obtenerUbicacion(): Promise<string> {
  try {
    const res = await fetch('https://ipapi.co/json/')
    const data = await res.json()
    if (data.city && data.country_name) return `${data.city}, ${data.country_name}`
    return 'Ubicación desconocida'
  } catch {
    return 'Ubicación desconocida'
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [sent, setSent] = useState(false)
  const [horas, setHoras] = useState<string[]>([])
  const router = useRouter()
  const { t } = useT()


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
      setError(t('login.errDomain', { domains: DOMINIOS_VALIDOS.join(', ') }))
      setLoading(false)
      return
    }

    const { error: err } = await auth.signIn(email, password)

    if (err) {
      setError(t('login.errCreds'))
      setLoading(false)
      return
    }

    const { data: { user } } = await auth.getUser()
    if (user) {
      const { data: usuario } = await usuariosRepo.findByEmail(user.email)

      if (usuario) {
        obtenerUbicacion().then(ubicacion => {
          usuariosRepo.updateUbicacion(usuario.id, ubicacion)
        })

        if (usuario.marca_hora) {
          await auth.registrarEntrada(usuario.id)
        }
      }
    }

    router.push(ROUTES.home)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!emailValido(email)) {
      setError(t('login.errDomainReset'))
      setLoading(false)
      return
    }
    const { error: err } = await auth.resetPasswordForEmail(email, `${window.location.origin}${ROUTES.resetPassword}`)
    if (err) { setError(t('login.errSendReset')); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 480, width: '100%', margin: '0 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📧</div>
          <h2 style={{ fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 12, color: '#0F172A' }}>{t('login.sentTitle')}</h2>
          <p style={{ color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
            {t('login.sentBody')}
          </p>
          <button onClick={() => { setSent(false); setMode('login') }}
            style={{ color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            &larr; {t('login.backToSignIn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, DM Sans, sans-serif' }}>
      {/* LEFT — Dark panel */}
      <div style={{
        width: 460, minWidth: 380, flexShrink: 0, background: '#0F172A', padding: '56px 48px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        color: '#FFFFFF',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5', boxShadow: '0 0 12px #4F46E5' }} />
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>Stratix Solutions</span>
          </div>

          <h2 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20 }}>
            {t('login.heroLead')}{' '}
            <span style={{ color: '#4F46E5' }}>Eminat.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>
            {t('login.heroSub')}
          </p>
        </div>

        <div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            {t('login.worldClock')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 28 }}>
            {ZONAS.map((z, i) => (
              <div key={z.ciudad} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12 }}>{z.emoji}</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.35)', width: 68 }}>{z.ciudad}</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#818CF8', fontWeight: 600 }}>
                  {horas[i] || '--:--'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            {t('login.authDomains')}
          </div>
          {DOMINIOS_VALIDOS.map(d => (
            <div key={d} style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4F46E5' }} />
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — White panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          {mode === 'login' && (
            <div style={{ marginBottom: 36 }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 8 }}>{t('login.signIn')}</h1>
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t('login.signInSub')}</p>
            </div>
          )}

          {mode === 'reset' && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 8 }}>{t('login.resetTitle')}</h3>
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.5 }}>
                {t('login.resetSub')}
              </p>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleReset}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>{t('login.emailLabel')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('login.emailPlaceholder')} required
                style={{ width: '100%', padding: '12px 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10, color: '#111827', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#4F46E5'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
            </div>

            {mode !== 'reset' && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>{t('login.passwordLabel')}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8}
                    style={{ width: '100%', padding: '12px 44px 12px 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10, color: '#111827', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#4F46E5'}
                    onBlur={e => e.target.style.borderColor = '#D1D5DB'} />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                    style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 24 }}>
                <button type="button" onClick={() => { setMode('reset'); setError('') }}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('login.forgot')}
                </button>
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: loading ? '#9CA3AF' : '#4F46E5', color: 'white', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all .2s',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(79,70,229,0.25)',
            }}>
              {loading ? t('common.processing') :
                mode === 'login' ? t('login.signIn') :
                t('login.sendResetLink')}
            </button>
          </form>

          {mode === 'reset' && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={() => { setMode('login'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                &larr; {t('login.backToSignIn')}
              </button>
            </div>
          )}

          {mode !== 'reset' && (
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5 }}>
                {t('login.noAccount')}{' '}
                <a href={`mailto:${MARKETING_COORDINATOR_EMAIL}`} style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 600 }}>{MARKETING_COORDINATOR_EMAIL}</a>
              </p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <span style={{ fontSize: 11, color: '#D1D5DB' }}>{t('common.tagline')}</span>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 768px) {
          div[style*="width: 420"] { display: none !important; }
        }
      `,
        }}
      />
    </div>
  )
}
