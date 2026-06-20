'use client'
import { useApp } from '@/shared/context/AppContext'
import { fmt } from '../format'

export default function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const { t2, t3, s3 } = useApp()
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium" style={{ color: t2 }}>{label}</span>
        <span className="font-mono" style={{ color: t3 }}>{fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: s3 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      </div>
    </div>
  )
}
