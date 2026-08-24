export default function FilterBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
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
