'use client'
import { useT } from '@/shared/i18n'
import { ListaRotulada } from '@/shared/components/ui'
import type { Pendiente } from '@/shared/dedup/types'
import ParDuplicado from '../ParDuplicado'
import type { EstadoLista } from '../useListaDuplicados/types'

type Props = {
  list: Omit<EstadoLista, 'ocupado'>
  onOpen: (par: Pendiente) => void
}

/** The pending pairs, each named by both records. A name not loaded yet says so, and one that
 *  could not load says that instead — the row never waits for it. */
export default function PendingQueue({ list, onOpen }: Props) {
  const { t } = useT()
  const { pendientes, summaries, namesLoading, error } = list
  // A failed load is not "nothing pending": the empty state only speaks once the list loaded.
  const isEmpty = pendientes.length === 0 && !error
  const pendingName = t(namesLoading ? 'dedup.nameLoading' : 'dedup.nameUnavailable')
  const nameOf = (id: string) => summaries[id] ?? pendingName

  return (
    <ListaRotulada
      label={t('dedup.listLabel')}
      emptyLabel={isEmpty ? t('dedup.emptyState') : undefined}
    >
      {pendientes.map(p => (
        <ParDuplicado
          key={`${p.item_id_a}-${p.item_id_b}`}
          par={p}
          names={[nameOf(p.item_id_a), nameOf(p.item_id_b)]}
          onAbrir={() => onOpen(p)}
        />
      ))}
    </ListaRotulada>
  )
}

// Split from `DuplicatesTab` so the tab stays one sitting long: this file only composes the
// shared list primitive with one `ParDuplicado` per pair, and draws no markup of its own.
