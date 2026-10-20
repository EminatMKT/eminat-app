import { supabase } from '@/shared/db/supabase'
import { RPCS } from '@/shared/schema'

type Args = {
  entidad: string
  itemIdA: string
  itemIdB: string
  motivo: string
  nota: string | null
}

/** Records a reviewer's call that two candidates are not the same person, or that they are but
 *  stay as separate rows — either way, the pair stops being unresolved. */
export default function descartar(args: Args) {
  const { entidad, itemIdA, itemIdB, motivo, nota } = args
  const rpcArgs = {
    p_entidad: entidad,
    p_item_id_a: itemIdA,
    p_item_id_b: itemIdB,
    p_motivo: motivo,
    p_nota: nota,
  }
  return supabase.rpc(RPCS.decidirDescarteDuplicado, rpcArgs)
}

// Thin wrapper over `decidir_descarte_duplicado`. The database itself rejects a blank note on
// the "same person, kept separate" motive — this layer only forwards what the caller decided.
