import { supabase } from '@/shared/db/supabase'
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT as CHANGE,
  type RealtimeChannel,
} from '@supabase/supabase-js'

export type { RealtimeChannel }

// Helper genérico de Realtime (Postgres changes), compartido por todas las capas de datos.
// El dispatch por-evento vive acá: cada caller pasa callbacks tipados y nunca compara strings.

export const removeChannel = (channel: RealtimeChannel) => supabase.removeChannel(channel)

export interface RowChangeHandlers<T> {
  onInsert?: (row: T) => void
  onUpdate?: (row: T) => void
  onDelete?: (row: Partial<T>) => void
}

// Suscribe a los cambios de una tabla (opcionalmente filtrada por fila) y despacha por evento.
// La RLS del usuario ya gatea qué filas recibe. Devuelve el canal (usar removeChannel al salir).
export function subscribeToTable<T extends Record<string, unknown>>(
  opts: { channel: string; table: string; filter?: string; schema?: string },
  h: RowChangeHandlers<T>,
): RealtimeChannel {
  return supabase
    .channel(opts.channel)
    .on<T>(
      REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
      { event: CHANGE.ALL, schema: opts.schema ?? 'public', table: opts.table, ...(opts.filter ? { filter: opts.filter } : {}) },
      payload => {
        if (payload.eventType === CHANGE.INSERT) h.onInsert?.(payload.new)
        else if (payload.eventType === CHANGE.UPDATE) h.onUpdate?.(payload.new)
        else if (payload.eventType === CHANGE.DELETE) h.onDelete?.(payload.old)
      },
    )
    .subscribe()
}
