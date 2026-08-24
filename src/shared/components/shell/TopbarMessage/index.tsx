'use client'
import { useApp } from '@/shared/context/AppContext'

// Banner de mensaje flash (ok/error) del topbar.
export default function TopbarMessage() {
  const { mensaje } = useApp()
  if (!mensaje) return null
  return (
    <div style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: mensaje.tipo === 'ok' ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: mensaje.tipo === 'ok' ? '#34D399' : '#F87171', border: `1px solid ${mensaje.tipo === 'ok' ? '#34D39940' : '#F8717140'}` }}>
      {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
    </div>
  )
}
