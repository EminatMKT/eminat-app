'use client'

import { useState, useEffect } from 'react'
import * as auth from '@/shared/db/auth'
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
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { error: err } = await auth.updatePassword(password)

    if (err) {
      setError('Update failed. The link may have expired.')
      setLoading(false)
      return
    }

    setListo(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (listo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>&#10003;</div>
          <h2 style={{ fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#0F172A' }}>Password updated</h2>
          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
            Your password has been changed successfully. Redirecting to sign in...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '0 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 20, marginBottom: 24, color: '#0F172A' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5', boxShadow: '0 0 10px #4F46E5' }} />
            Stratix Solutions
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, color: '#0F172A' }}>New password</h2>
          <p style={{ color: '#9CA3AF', fontSize: 13 }}>Enter your new password to continue</p>
        </div>

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              style={{ width: '100%', padding: '12px 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10, color: '#111827', fontSize: 15, fontFamily: 'Inter, DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Confirm password</label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repeat your password"
              required
              minLength={8}
              style={{ width: '100%', padding: '12px 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10, color: '#111827', fontSize: 15, fontFamily: 'Inter, DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: loading ? '#9CA3AF' : '#4F46E5', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, DM Sans, sans-serif', boxShadow: loading ? 'none' : '0 4px 12px rgba(79,70,229,0.25)' }}
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
