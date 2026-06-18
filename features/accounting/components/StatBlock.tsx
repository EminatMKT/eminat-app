export default function StatBlock({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{title}</div>
      <div className="mt-1.5 text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  )
}
