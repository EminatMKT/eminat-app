import { supabase } from '@/shared/db/supabase'
import { RPCS } from '@/shared/schema'

type Args = {
  entidad: string
  ganadorId: string
  perdedorId: string
  valoresFinales: Record<string, unknown>
  /** Loser child-row ids the reviewer chose not to keep; `[]` keeps every one. */
  excludedIds: string[]
}

/** Keeps `ganadorId`, deletes `perdedorId`, and writes the given value (a null or a date too, not
 *  only strings) into every column where the rows differed. The database rejects a merge that
 *  leaves a differing column unresolved — this layer surfaces that error instead of hiding it. */
export default function fusionar(args: Args) {
  const { entidad, ganadorId, perdedorId, valoresFinales, excludedIds } = args
  const rpcArgs = {
    p_entidad: entidad,
    p_ganador_id: ganadorId,
    p_perdedor_id: perdedorId,
    p_valores_finales: valoresFinales,
    p_contactos_excluidos: excludedIds,
  }
  return supabase.rpc(RPCS.fusionarDuplicado, rpcArgs)
}

// Thin wrapper over `fusionar_duplicado`. One winner, one loser, the full merge values the
// caller built from both rows plus the reviewer's clicks, and the loser child rows the
// reviewer excluded from the merge.
