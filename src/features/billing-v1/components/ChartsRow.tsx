'use client'

// Contenedor de los dos charts lado a lado de cada tab.
export default function ChartsRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>{children}</div>
}
