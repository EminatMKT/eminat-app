'use client'
import { useMemo } from 'react'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import {
  compareDailyHours,
  declaredHoursByDay,
  declaredWeeklyHours,
  sortRanges,
} from '@/features/tasks/utils/availability'
import { useT } from '@/shared/i18n'
import { Button, ListaRotulada } from '@/shared/components/ui'
import { AVAILABILITY_DAYS, STATUS_COPY_KEYS, STATUS_SYMBOLS } from './constants'
import s from './index.module.css'

type Props = {
  member: AvailabilityMemberDto
  onEdit?: () => void
}

export default function MemberAvailabilityCard({ member, onEdit }: Props) {
  const { t } = useT()
  const ranges = useMemo(() => sortRanges(member.ranges), [member.ranges])
  const hoursByDay = declaredHoursByDay(ranges)
  const weeklyHours = declaredWeeklyHours(ranges)

  return (
    <article className={s.card}>
      <div className={s.head}>
        <div className={s.persona}>
          <div className={s.avatar}>{member.name.at(0) ?? '?'}</div>
          <div>
            <h2 className={s.nombre}>{member.name}</h2>
            {member.team && <p className={s.resumen}>{member.team.name}</p>}
          </div>
        </div>
        {member.canEdit && onEdit && <Button kind="edit" iconOnly onClick={onEdit} />}
      </div>
      {ranges.length === 0 ? <p className={s.empty}>{t('tasks.availability.notConfigured')}</p> : <>
        <p className={s.total}>{t('tasks.availability.weekDeclared', { hours: weeklyHours })}</p>
        <div className={s.days}>{AVAILABILITY_DAYS.map(day => {
          const dayRanges = ranges.filter(range => range.weekday === day.weekday)
          const comparison = compareDailyHours(hoursByDay[day.weekday] ?? 0, member.workday?.hoursPerDay ?? null)
          const label = t('tasks.availability.dayLabel', { day: t(day.labelKey) })
          return <section className={s.day} key={day.weekday}>
            <h3>{label}</h3>
            {dayRanges.length === 0 ? <p className={s.emptyDay}>{t('tasks.availability.emptyDay')}</p> : <>
              <ListaRotulada label={label}>{dayRanges.map(range => <li key={range.id} className={s.range}>
                <span>{range.startsAt}–{range.endsAt}</span>
                {range.note && <small>{range.note}</small>}
              </li>)}</ListaRotulada>
              <p className={`${s.comparison} ${s[comparison.status]}`}>
                <span aria-hidden="true">{STATUS_SYMBOLS[comparison.status]}</span>
                {t(STATUS_COPY_KEYS[comparison.status], {
                  declared: comparison.declaredHours,
                  expected: comparison.expectedHours ?? 0,
                  difference: Math.abs(comparison.differenceHours ?? 0),
                })}
              </p>
            </>}
          </section>
        })}</div>
      </>}
    </article>
  )
}
