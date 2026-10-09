// centinela-exime: bloques-similares@6 — no hay fila/grid reusable en shared/components; OverviewTab repite lo mismo a mano aparte.
import type { Props } from './types'
import s from './index.module.css'

export default function ChartRow({ children }: Props) {
  return <div className={s.row}>{children}</div>
}
