import { useT } from '@/shared/i18n'
import type { DayCaptionProps } from './types'
import s from './index.module.css'

export default function DayCaption({ day }: DayCaptionProps) {
  const { t } = useT()
  const label = t(day.labelKey)

  return (
    <div className={s.root}>
      <span className={s.label}>{label}</span>
    </div>
  )
}

// DayCaption carries only the weekday label. A jornada is a weekly target, so no single day is
// judged against it: the member card compares the whole week once.
