'use client'

// Barra de filtros de cada tab (selects + boton clear).
export default function FilterBar({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
}
