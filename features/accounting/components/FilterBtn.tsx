'use client'
import { useApp } from '@/shared/context/AppContext'

export default function FilterBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  const { border, s1, t2 } = useApp()
  return (
    <button onClick={onClick}
      className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition"
      style={active
        ? { borderColor: color, background: `${color}15`, color }
        : { borderColor: border, background: s1, color: t2 }}>
      {children}
    </button>
  )
}
