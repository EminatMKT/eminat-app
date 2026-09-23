'use client'
import { useApp } from '@/shared/context/AppContext'

// Chrome compartido de las tablas: card + thead + estado vacio. Las filas van como children.
export default function DataTable({ headers, empty, emptyText, children }: { headers: string[]; empty: boolean; emptyText: string; children: React.ReactNode }) {
  const { s1, s2, border, t3 } = useApp()
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ background: s2 }}>
          {headers.map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <div style={{ textAlign: 'center', padding: 40, color: t3 }}>{emptyText}</div>}
    </div>
  )
}
