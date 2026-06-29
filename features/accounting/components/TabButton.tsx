import { ACCENT } from '../data'

export default function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
        active ? 'border-b-2 bg-white text-gray-900' : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
      }`}
      style={active ? { borderBottomColor: ACCENT.teal, color: ACCENT.teal } : undefined}
    >
      <span>{icon}</span>{label}
    </button>
  )
}
