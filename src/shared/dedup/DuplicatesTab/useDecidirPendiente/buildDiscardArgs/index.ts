import type { Pendiente } from '@/shared/dedup/types'

/** The `descartar` call args for discarding the open pair with the reviewer's motive and note. */
export default function buildDiscardArgs(
  entidad: string,
  abierto: Pendiente,
  motivo: string,
  nota: string | null,
) {
  const args = {
    entidad,
    itemIdA: abierto.item_id_a,
    itemIdB: abierto.item_id_b,
    motivo,
    nota,
  }
  return args
}

// Builds `descartar`'s args from the open pair, pulled out of `useDecidirPendiente` so this
// 5-field literal doesn't push the hook over this repo's file-length cap.
