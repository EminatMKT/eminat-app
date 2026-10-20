import { supabase } from '@/shared/db/supabase'
import { RPCS } from '@/shared/schema'
import type { NivelCandidato } from '@/shared/dedup'

type Args = {
  entidad: string
  itemIdA: string
  itemIdB: string
  nivel: NivelCandidato
  origen: string
}

/** Flags an ambient duplicate candidate pair outside a scan: a manual add or an import batch
 *  already knows both real ids, so it raises the same signal `escanear_duplicados` would have
 *  found later on its own. */
export default function registrar(args: Args) {
  const { entidad, itemIdA, itemIdB, nivel, origen } = args
  const rpcArgs = {
    p_entidad: entidad,
    p_item_id_a: itemIdA,
    p_item_id_b: itemIdB,
    p_nivel: nivel,
    p_origen: origen,
  }
  return supabase.rpc(RPCS.registrarCandidatoDuplicado, rpcArgs)
}

// Thin wrapper over `registrar_candidato_duplicado`, sibling to `escanear`/`fusionar`/
// `descartar`: the data layer is the only place this RPC's name is spelled.
