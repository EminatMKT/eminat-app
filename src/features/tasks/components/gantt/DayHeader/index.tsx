'use client'
import type { CSSProperties } from 'react'
import { DIA_W } from '@/features/tasks/utils/gantt-layout'
import s from './index.module.css'

const INICIALES_DIA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

type Props = {
  d: Date
  hoy: Date
}

export default function DayHeader({ d, hoy }: Props) {
  const esHoy = d.toDateString() === hoy.toDateString()
  const esFinde = d.getDay() === 0 || d.getDay() === 6
  return (
    <div className={`${s.day} ${esHoy ? s.hoy : ''} ${esFinde ? s.finde : ''}`}
      style={{ '--dia-w': `${DIA_W}px` } as CSSProperties}>
      <div className={s.num}>{d.getDate()}</div>
      <div>{INICIALES_DIA[d.getDay()]}</div>
    </div>
  )
}
