'use client'
import { useT } from '@/shared/i18n'
import { ColorBadge, FilaLista } from '@/shared/components/ui'
import { shortMoment } from '@/shared/utils'
import { NIVEL_EXACTA } from '@/shared/dedup/types'
import type { Pendiente } from '@/shared/dedup/types'

type Props = {
  par: Pendiente
  onAbrir: () => void
}

/** One row in the unresolved-duplicates list: its match level and when the scan found it.
 *  Composes `FilaLista` and `ColorBadge` — searched `src/shared/import` and `src/shared/dashboard`
 *  for a row-like primitive that already draws its own markup; none fit, so nothing here is. */
export default function ParDuplicado({ par, onAbrir }: Props) {
  const { t, intlLocale } = useT()
  const exacta = par.nivel === NIVEL_EXACTA
  const color = exacta ? 'var(--c-accent)' : 'var(--c-warn-solid)'

  return (
    <FilaLista color={color} onAbrir={onAbrir} etiqueta={t('dedup.openAria')}>
      <ColorBadge color={color}>{t(exacta ? 'dedup.levelExact' : 'dedup.levelPartial')}</ColorBadge>
      {shortMoment(new Date(par.detectado_at), intlLocale)}
    </FilaLista>
  )
}

// A list row for one duplicate-candidate pair, nothing more: opening it to compare or decide is
// `PairDetail`'s job, not this one's.
