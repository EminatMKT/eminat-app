'use client'
import { ReactNode } from 'react'
import { scoreColor } from '@/lib/researchEngine'

export const ACCENT = {
  purple: '#6c5ce7', teal: '#00cec9', red: '#e17055', yellow: '#fdcb6e',
  green: '#10b981', blue: '#60A5FA', pink: '#F472B6', slate: '#64748b',
}

// ── Layout primitives ────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, className = '' }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <div className="text-base font-bold text-gray-900">{title}</div>}
            {subtitle && <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}

export function KPI({ label, value, accent = ACCENT.purple, hint }: { label: string; value: ReactNode; accent?: string; hint?: string }) {
  return (
    <div className="min-w-[150px] rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: accent }}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-gray-400">{hint}</div>}
    </div>
  )
}

export function ScoreCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const color = scoreColor(value)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <span className="text-lg font-extrabold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      {hint && <div className="mt-1.5 text-[10px] text-gray-400">{hint}</div>}
    </div>
  )
}

export function Badge({ children, color = ACCENT.purple }: { children: ReactNode; color?: string }) {
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${color}1f`, color }}>{children}</span>
}

export function FilterBtn({ active, color = ACCENT.purple, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
      style={active ? { borderColor: color, background: `${color}15`, color } : { borderColor: '#e5e7eb', background: 'white', color: '#6b7280' }}>
      {children}
    </button>
  )
}

export function PrimaryBtn({ onClick, children, disabled, color = ACCENT.purple }: { onClick?: () => void; children: ReactNode; disabled?: boolean; color?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-lg px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
      style={{ background: disabled ? '#9CA3AF' : color }}>
      {children}
    </button>
  )
}

export function GhostBtn({ onClick, children, color = '#6b7280' }: { onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-gray-50" style={{ color }}>
      {children}
    </button>
  )
}

// ── Table primitives ─────────────────────────────────────────────────────
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
}
export function Th({ children, align = 'left' }: { children?: ReactNode; align?: 'left' | 'right' | 'center' }) {
  return <th className="border-b border-gray-200 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ textAlign: align }}>{children}</th>
}
export function Td({ children, align = 'left', mono, color, bold }: { children?: ReactNode; align?: 'left' | 'right' | 'center'; mono?: boolean; color?: string; bold?: boolean }) {
  return <td className={`border-b border-gray-100 px-3 py-2.5 text-xs ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`} style={{ textAlign: align, color: color || '#111827' }}>{children}</td>
}
export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <tr className="hover:bg-gray-50" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>{children}</tr>
}

export function EmptyState({ icon = '📭', title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
      <div className="mb-2 text-3xl">{icon}</div>
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  )
}

// ── Modal + form fields ──────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer, width = 560 }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl" style={{ maxWidth: width }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="text-lg font-bold text-gray-900">{title}</div>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

const fieldCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-400'

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <label className="mb-1 block text-[11px] font-semibold text-gray-500">{label}</label>
      {children}
    </div>
  )
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={fieldCls} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldCls} min-h-[80px] resize-y`} />
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={fieldCls}>{children}</select>
}
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: ACCENT.purple }} />
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </label>
  )
}

export function Stars({ rating }: { rating?: number }) {
  const r = Number(rating) || 0
  return <span style={{ color: ACCENT.yellow, fontWeight: 700 }}>{r ? `★ ${r.toFixed(1)}` : '—'}</span>
}
