import { ACCENT } from '../data'
import s from './TabButton.module.css'

export default function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`${s.tab} ${active ? s.active : s.inactive}`}
      style={active ? { borderBottomColor: ACCENT.teal, color: ACCENT.teal } : undefined}
    >
      <span>{icon}</span>{label}
    </button>
  )
}
