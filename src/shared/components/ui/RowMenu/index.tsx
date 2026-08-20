'use client'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'

export type RowMenuItem = { label: string; onClick: () => void; danger?: boolean }

// Menú de acciones de una fila (los tres puntos verticales). Reemplaza la hilera
// de botones que ocupaba media tabla.
//
// El panel se posiciona con `fixed` a partir del rect del botón, no con
// `absolute`: la tabla vive dentro de un contenedor con overflow-x auto, y ahí
// un desplegable absolute queda recortado por el scroll.
export default function RowMenu({ items, label }: { items: RowMenuItem[]; label: string }) {
  const { s1, s2, border, t1, t2 } = useApp()
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pos) return
    // El listener corre en captura, así que llega ANTES que el onClick del item:
    // sin este guard cerraría el menú y desmontaría el botón antes de ejecutar
    // la acción — el click se perdía y no pasaba nada.
    const cerrar = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      setPos(null)
    }
    const porTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setPos(null) }
    document.addEventListener('click', cerrar, true)
    document.addEventListener('keydown', porTecla)
    window.addEventListener('resize', cerrar)
    // Scrollear con el menú abierto lo dejaría flotando lejos del botón.
    window.addEventListener('scroll', cerrar, true)
    return () => {
      document.removeEventListener('click', cerrar, true)
      document.removeEventListener('keydown', porTecla)
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('scroll', cerrar, true)
    }
  }, [pos])

  function alternar(e: React.MouseEvent) {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
  }

  return (
    <>
      <button ref={btnRef} onClick={alternar} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos}
        style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: pos ? s2 : 'transparent', color: t2, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>
        ⋮
      </button>
      {pos && (
        <div role="menu" ref={panelRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 200, minWidth: 170, background: s1, border: `1px solid ${border}`, borderRadius: 10, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
          {items.map(it => (
            <button key={it.label} role="menuitem" onClick={() => { setPos(null); it.onClick() }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: it.danger ? '#F87171' : t1, fontSize: 12, cursor: 'pointer' }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
