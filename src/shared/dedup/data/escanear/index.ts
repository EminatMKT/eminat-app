import { supabase } from '@/shared/db/supabase'
import { RPCS } from '@/shared/schema'

/** Runs the ambient scan for one entity: registers any new candidate pairs it finds. */
export default function escanear(entidad: string) {
  const args = { p_entidad: entidad }
  return supabase.rpc(RPCS.escanearDuplicados, args)
}

// Thin wrapper over the `escanear_duplicados` RPC, so `DuplicatesTab`'s scan button never
// touches `supabase` directly — the data layer is the only place a table or RPC name is spelled.
