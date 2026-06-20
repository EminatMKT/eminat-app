'use client'
import { useApp } from '@/shared/context/AppContext'
import { ACCENT } from '../data'

export default function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  const { s1, t3 } = useApp()
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
        active ? 'border-b-2' : 'border-b-2 border-transparent'
      }`}
      style={active ? { background: s1, borderBottomColor: ACCENT.teal, color: ACCENT.teal } : { color: t3 }}
    >
      <span>{icon}</span>{label}
    </button>
  )
}
