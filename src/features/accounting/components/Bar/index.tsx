import type { CSSProperties } from 'react'
import { fmt } from '../../format'
import s from './index.module.css'

type Props = {
  label: string
  value: number
  max: number
  color: string
}

export default function Bar({ label, value, max, color }: Props) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <span className={s.label}>{label}</span>
        <span className={s.value}>{fmt(value)}</span>
      </div>
      <div className={s.track}>
        <div className={s.fill} style={{ '--bar-width': `${pct}%`, '--bar-color': color, '--bar-color-alpha': `${color}cc` } as CSSProperties} />
      </div>
    </div>
  )
}
