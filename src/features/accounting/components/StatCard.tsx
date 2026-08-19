// Card de stat con borde-izquierdo de color (label uppercase + value bold).
// compact = variante chica de la barra superior (KPI); default = variante grande del resumen.
export default function StatCard({ label, value, color, compact = false }: { label: string; value: string; color: string; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${compact ? 'min-w-[160px] px-4 py-3' : 'p-4'}`} style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`font-bold ${compact ? 'mt-1 text-xl' : 'mt-1.5 text-2xl'}`} style={{ color }}>{value}</div>
    </div>
  )
}
