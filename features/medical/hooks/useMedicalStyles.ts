import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'

// Objetos de estilo compartidos del módulo, derivados de los tokens del tema.
export function useMedicalStyles() {
  const { s1, s2, border, t2, accent } = useApp()
  const cardStyle: CSSProperties = { background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
  const statCardStyle: CSSProperties = { ...cardStyle, display: 'flex', flexDirection: 'column', gap: 4 }
  const btnPrimary: CSSProperties = { padding: '8px 16px', borderRadius: 10, background: accent, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }
  const btnSecondary: CSSProperties = { padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans' }
  const modalOverlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
  const modalBox: CSSProperties = { background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }
  const labelStyle: CSSProperties = { fontSize: 11, fontWeight: 600, color: t2, marginBottom: 4, display: 'block' }
  const hipaaShield: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.12)', color: '#34D399', fontWeight: 600 }
  return { cardStyle, statCardStyle, btnPrimary, btnSecondary, modalOverlay, modalBox, labelStyle, hipaaShield }
}
