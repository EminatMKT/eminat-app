import type { Pendiente } from '@/shared/dedup/types'

/** The `fusionar` call args for merging the open pair's loser into its winner. */
export default function buildMergeArgs(
  entidad: string,
  abierto: Pendiente,
  valoresFinales: Record<string, unknown>,
  excludedIds: string[],
) {
  const args = {
    entidad,
    ganadorId: abierto.item_id_a,
    perdedorId: abierto.item_id_b,
    valoresFinales,
    excludedIds,
  }
  return args
}

// Builds `fusionar`'s args from the open pair plus the caller's merge values and exclusions,
// pulled out of `useDecidirPendiente` so this 5-field literal doesn't push the hook over this
// repo's file-length cap.
