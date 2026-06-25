'use client'
import { useApp } from '@/shared/context/AppContext'
import { D } from './appShellConfig'

// Toggle de tema claro/oscuro del topbar.
export default function ThemeToggle() {
  const { dark, setDark } = useApp()
  return (
    <button onClick={() => setDark(!dark)} style={{ padding: '6px 11px', borderRadius: 20, border: `1px solid ${D.border}`, background: D.s2, color: D.t2, fontSize: 11, cursor: 'pointer' }}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
