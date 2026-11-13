'use client'
import { useT } from '@/shared/i18n'
import { Pressable } from '@/shared/components/ui'
import accessibleLabel from '../accessible-label'
import type { BlockProps } from '../types'
import s from '../index.module.css'

type Props = Pick<BlockProps, 'range' | 'readOnly' | 'onActivate'>

/** The pressable face of a block: its time range, its note when present, and its ARIA label. */
export default function BlockContent({ range, readOnly, onActivate }: Props) {
  const { t } = useT()
  const label = accessibleLabel(range, readOnly, t)

  return <Pressable accessibleLabel={label} onClick={onActivate} className={s.content}>
    <span className={s.time}>{range.startsAt}–{range.endsAt}</span>
    {range.note ? <span className={s.note}>{range.note}</span> : null}
  </Pressable>
}

// BlockContent is what a person activates on a block; Block lays it out beside the handles.
