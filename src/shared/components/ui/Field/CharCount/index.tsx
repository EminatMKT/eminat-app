'use client'
import { useT } from '@/shared/i18n'
import countTone from '../count-tone'
import s from '../index.module.css'

type Props = {
  /** What the control's `aria-describedby` points at. */
  id: string
  length: number
  max: number
}

export default function CharCount({ id, length, max }: Props) {
  const { t } = useT()
  const tone = countTone(length, max)
  if (!tone) return null
  return <p id={id} className={s.count} data-tone={tone}>{t('common.field.count', { n: length, max })}</p>
}

// «118/120» under a box that is about to stop taking characters. It is not a live region: read
// aloud on every keystroke it would drown what is being typed, so a screen reader reaches it
// through the control's description instead, when the box is focused.
