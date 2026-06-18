export default function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="min-w-[160px] rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  )
}
