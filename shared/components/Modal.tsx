'use client'
import { useApp } from '@/shared/context/AppContext'

export default function Modal({ title, width = 480, onClose, children }: {
  title?: string; width?: number; onClose: () => void; children: React.ReactNode
}) {
  const { s1, border, t1, t3 } = useApp()
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{title}</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
