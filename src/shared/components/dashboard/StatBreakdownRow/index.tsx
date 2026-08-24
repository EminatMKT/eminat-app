import type { ReactNode } from 'react'
import { DASHBOARD_THEME } from '@/shared/components/dashboard/theme'

// Un renglón del desglose de una StatCard: concepto a la izquierda, cifra a la derecha.
// Cifras en mono tabular para que las unidades queden alineadas entre renglones.
export default function StatBreakdownRow({ label, value }: { label: string; value: ReactNode }) {
  const { t1, t2 } = DASHBOARD_THEME
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, fontSize: 11, lineHeight: 1.7 }}>
      <span style={{ color: t2 }}>{label}</span>
      <span style={{ color: t1, fontFamily: 'DM Mono', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
