'use client'
import { useApp } from '@/shared/context/AppContext'

// Overlay + card + header (titulo + cerrar) compartido por los modales de cobranzas.
export default function ModalShell({ title, onClose, width = 440, children }: { title: string; onClose: () => void; width?: number; children: React.ReactNode }) {
  const { s1, border, t1, t3 } = useApp()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
