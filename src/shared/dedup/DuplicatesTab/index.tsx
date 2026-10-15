'use client'
import { useT } from '@/shared/i18n'
import { Button, ListaRotulada } from '@/shared/components/ui'
import { MOTIVO_NO_ES_LA_MISMA, MOTIVO_SEPARADAS } from '@/shared/dedup/types'
import useListaDuplicados from './useListaDuplicados'
import useAbrirPendiente from './useAbrirPendiente'
import useDecidirPendiente from './useDecidirPendiente'
import ParDuplicado from './ParDuplicado'
import PairDetail from './PairDetail'
import type { Props } from './types'

export default function DuplicatesTab<T>(props: Props<T>) {
  const { entidad, cargarItem, renderResumen, renderComparacion } = props
  const { t } = useT()
  const lista = useListaDuplicados(entidad)
  const par = useAbrirPendiente(cargarItem)
  const alDecidir = () => { par.cerrarPendiente(); void lista.recargar() }
  const decidir = useDecidirPendiente(entidad, par.abierto, par.elecciones, alDecidir)

  return (
    <>
      {/* Scan is this screen's primary action while no pair is open — merging or discarding
          only becomes possible once a pair is, and that lives in `PairDetail` instead. */}
      <Button kind="scan" onClick={() => void lista.escanearPendientes()} ocupado={lista.ocupado} />

      <ListaRotulada
        label={t('dedup.listLabel')}
        emptyLabel={lista.pendientes.length === 0 ? t('dedup.emptyState') : undefined}
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
          error={decidir.error}
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

// Composes the tab from three small hooks (the list, the open pair, and deciding it) and three
// small components. No state or Supabase call lives in this file.
