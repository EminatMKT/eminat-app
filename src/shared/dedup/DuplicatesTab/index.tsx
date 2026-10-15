'use client'
import { useT } from '@/shared/i18n'
import { Button, ListaRotulada, WarningCallout } from '@/shared/components/ui'
import { MOTIVO_NO_ES_LA_MISMA, MOTIVO_SEPARADAS } from '@/shared/dedup/types'
import useDuplicatesTab from './useDuplicatesTab'
import ParDuplicado from './ParDuplicado'
import PairDetail from './PairDetail'
import type { Props } from './types'

export default function DuplicatesTab<T>(props: Props<T>) {
  const { renderResumen, renderComparacion } = props
  const { t } = useT()
  const { list: lista, pair: par, resolve: decidir } = useDuplicatesTab(props)
  // A failed load is not "nothing pending": the empty state only speaks once the list loaded.
  const isEmpty = lista.pendientes.length === 0 && !lista.error

  return (
    <>
      {/* Scan is this screen's primary action while no pair is open — merging or discarding
          only becomes possible once a pair is, and that lives in `PairDetail` instead. */}
      <Button kind="scan" onClick={() => void lista.escanearPendientes()} ocupado={lista.ocupado} />
      {lista.error && <WarningCallout message={t('dedup.listFailed')} />}
      {par.error && <WarningCallout message={t('dedup.openFailed')} />}

      <ListaRotulada
        label={t('dedup.listLabel')}
        emptyLabel={isEmpty ? t('dedup.emptyState') : undefined}
      >
        {lista.pendientes.map(p => (
          <ParDuplicado key={`${p.item_id_a}-${p.item_id_b}`} par={p}
            onAbrir={() => void par.abrirPendiente(p)} />
        ))}
      </ListaRotulada>

      {par.abierto && par.itemA && par.itemB && (
        <PairDetail
          itemA={par.itemA}
          itemB={par.itemB}
          ocupado={decidir.ocupado}
          errorDescarte={decidir.errorDescarte}
          errorFusion={decidir.errorFusion}
          renderResumen={renderResumen}
          renderComparacion={renderComparacion}
          onElegir={par.onElegir}
          onCancelar={par.cerrarPendiente}
          onNotSame={() => void decidir.descartarPendiente(MOTIVO_NO_ES_LA_MISMA, null)}
          onKeepSeparate={nota => void decidir.descartarPendiente(MOTIVO_SEPARADAS, nota)}
          onFusionar={() => void decidir.fusionarPendiente()}
        />
      )}
    </>
  )
}

// Composes the tab from `useDuplicatesTab` (the list, the open pair, and deciding it) and three
// small components. No state or Supabase call lives in this file.
