// Card de stat con borde-izquierdo de color (label uppercase + value bold).
// compact = variante chica de la barra superior (KPI); default = variante grande del resumen.
'use client'
import { useApp } from '@/shared/context/AppContext'

export default function StatCard({ label, value, color, compact = false }: { label: string; value: string; color: string; compact?: boolean }) {
  const { s1, border, t3 } = useApp()
  return (
    <div className={`rounded-xl shadow-sm ${compact ? 'min-w-[160px] px-4 py-3' : 'p-4'}`} style={{ background: s1, border: `1px solid ${border}`, borderLeft: `3px solid ${color}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t3 }}>{label}</div>
      <div className={`font-bold ${compact ? 'mt-1 text-xl' : 'mt-1.5 text-2xl'}`} style={{ color }}>{value}</div>
    </div>
  )
}
