import { supabase } from '@/shared/db/supabase'
import { RPCS } from '@/shared/schema'

type Args = {
  entidad: string
  ganadorId: string
  perdedorId: string
  valoresFinales: Record<string, string>
}

/** Keeps `ganadorId`, deletes `perdedorId`, and writes the caller's chosen value into every
 *  column where the two rows differed. The database itself rejects a merge that leaves a
 *  differing column unresolved — this layer surfaces that error instead of hiding it. */
export default function fusionar(args: Args) {
  const { entidad, ganadorId, perdedorId, valoresFinales } = args
  const rpcArgs = {
    p_entidad: entidad,
    p_ganador_id: ganadorId,
    p_perdedor_id: perdedorId,
    p_valores_finales: valoresFinales,
  }
  return supabase.rpc(RPCS.fusionarDuplicado, rpcArgs)
}

// Thin wrapper over `fusionar_duplicado`. One winner, one loser, and the field-by-field choices
// `DuplicatesTab` collected through the caller's own comparison UI.
