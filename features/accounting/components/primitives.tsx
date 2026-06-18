import { fmt } from '../format'

export function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="min-w-[160px] rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  )
}

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-base font-bold text-gray-900">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

export function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-mono text-gray-500">{fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      </div>
    </div>
  )
}

export function StatBlock({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{title}</div>
      <div className="mt-1.5 text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

export function FilterBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition"
      style={active
        ? { borderColor: color, background: `${color}15`, color }
        : { borderColor: '#e5e7eb', background: 'white', color: '#6b7280' }}>
      {children}
    </button>
  )
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
}

export function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className="border-b border-gray-200 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ textAlign: align }}>{children}</th>
}

export function Td({ children, align = 'left', mono = false, color, bold = false }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean; color?: string; bold?: boolean }) {
  return <td className={`border-b border-gray-100 px-3 py-2.5 text-xs ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`} style={{ textAlign: align, color: color || '#111827' }}>{children}</td>
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-gray-50">{children}</tr>
}
