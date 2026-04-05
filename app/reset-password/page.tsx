'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const router = useRouter()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)

    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError('Error al actualizar. El link puede haber expirado.')
      setLoading(false)
      return
    }

    setListo(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (listo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Contraseña actualizada</h2>
          <p style={{ color: 'var(--t2)', fontSize: 14, lineHeight: 1.6 }}>
            Tu contraseña fue cambiada correctamente. Redirigiendo al login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '0 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 20, marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C6FF7', boxShadow: '0 0 10px #7C6FF7' }} />
            eminat app
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Nueva contraseña</h2>
          <p style={{ color: 'var(--t3)', fontSize: 13 }}>Ingresa tu nueva contraseña para continuar</p>
        </div>

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Confirmar contraseña</label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              required
              minLength={8}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#F87171', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#7C6FF7', color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, fontFamily: 'DM Sans' }}
          >
            {loading ? 'Actualizando...' : 'Cambiar contraseña →'}
          </button>
        </form>
      </div>
    </div>
  )
}
