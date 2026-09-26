'use client'
import { useT } from '@/shared/i18n'
import s from '../index.module.css'

type Props = {
  /** What the control's `aria-describedby` points at. */
  id: string
  /** Characters the last insertion lost to the limit. Zero: nothing to say. */
  cut: number
  /** The field's visible label, which names it in the message. */
  field: string
  max: number
}

export default function CutNotice({ id, cut, field, max }: Props) {
  const { t } = useT()
  const key = cut === 1 ? 'common.field.cutOne' : 'common.field.cutMany'
  const message = cut > 0 ? t(key, { n: cut, field, max }) : null
  return <p id={id} className={s.cut} aria-live="polite">{message}</p>
}

// The browser cuts a paste at `maxLength` and says nothing: this is where the Field says it. The
// live region is drawn even while empty, because a screen reader only announces a change to a
// region it already knew; `polite` waits for the person to finish what they were doing.
