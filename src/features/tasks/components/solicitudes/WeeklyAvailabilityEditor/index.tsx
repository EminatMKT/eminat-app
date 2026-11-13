'use client'
import type { ComponentProps } from 'react'
import AvailabilityWeekGrid from '../AvailabilityWeekGrid'
import ValidationBanner from './ValidationBanner'
import s from './index.module.css'

type Props = {
  gridProps: ComponentProps<typeof AvailabilityWeekGrid>
  bannerProps: ComponentProps<typeof ValidationBanner> | null
}

/** Pure render of the drag/resize grid and its validation banner: MemberAvailabilityModal owns
 *  the controller and derives both prop bags, this stays presentational. */
export default function WeeklyAvailabilityEditor(props: Props) {
  const { gridProps, bannerProps } = props

  return <div className={s.editor}>
    <AvailabilityWeekGrid {...gridProps} />
    {bannerProps != null && <ValidationBanner {...bannerProps} />}
  </div>
}

// Save/cancel actions moved to MemberAvailabilityModal's Modal footer; this never renders them.
