'use client'
import { useT } from '@/shared/i18n'
import { ActionStrip, Button, WarningCallout } from '@/shared/components/ui'
import { MOTIVO_NO_ES_LA_MISMA, MOTIVO_SEPARADAS } from '@/shared/dedup/types'
import useDuplicatesTab from './useDuplicatesTab'
import PendingQueue from './PendingQueue'
import PairDetail from './PairDetail'
import type { Props } from './types'

export default function DuplicatesTab<T>(props: Props<T>) {
  const { renderResumen, renderComparacion } = props
  const { t } = useT()
  const { list: lista, pair: par, resolve: decidir } = useDuplicatesTab(props)

  return (
    <>
      {/* Scan is this screen's primary action while no pair is open — merging or discarding
          only becomes possible once a pair is, and that lives in `PairDetail` instead. */}
      <ActionStrip>
        <Button kind="scan" onClick={() => void lista.escanearPendientes()} ocupado={lista.ocupado} />
      </ActionStrip>
      {lista.error && <WarningCallout message={t('dedup.listFailed')} />}
      {par.error && <WarningCallout message={t('dedup.openFailed')} />}

      <PendingQueue list={lista} onOpen={p => void par.abrirPendiente(p)} />

      {par.abierto && par.itemA && par.itemB && (
        <PairDetail
          itemA={par.itemA}
          itemB={par.itemB}
          ocupado={decidir.ocupado}
          errorDescarte={decidir.errorDescarte}
          errorFusion={decidir.errorFusion}
          renderResumen={renderResumen}
          renderComparacion={renderComparacion}
          controls={par.controls}
          onCancelar={par.cerrarPendiente}
          onNotSame={() => void decidir.descartarPendiente(MOTIVO_NO_ES_LA_MISMA, null)}
          onKeepSeparate={nota => void decidir.descartarPendiente(MOTIVO_SEPARADAS, nota)}
          onFusionar={() => void decidir.fusionarPendiente()}
        />
      )}
    </>
  )
}

// Composes the tab from `useDuplicatesTab` (the list, the open pair, and deciding it), the
// `PendingQueue` and `PairDetail`. No state or Supabase call lives in this file.
