import s from './FilterBtn.module.css'

export default function FilterBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={s.btn}
      style={active
        ? { borderColor: color, background: `${color}15`, color }
        : { borderColor: 'var(--c-border)', background: 'var(--c-s1)', color: 'var(--c-t2)' }}>
      {children}
    </button>
  )
}
