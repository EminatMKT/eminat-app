'use client'

// Badge de periodo (1Q/2Q). color1Q define el color del 1Q; 2Q siempre violeta.
export default function PeriodBadge({ periodo, color1Q }: { periodo?: string; color1Q: string }) {
  const c = periodo === '1Q' ? color1Q : '#A78BFA'
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${c}20`, color: c, fontWeight: 600 }}>{periodo}</span>
  )
}
