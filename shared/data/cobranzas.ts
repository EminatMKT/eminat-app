import { supabase } from '@/shared/db/supabase'
import { COLUMNS, type TableName } from './tables'

// Capa de acceso a datos del dominio Cobranzas.
// Las tablas (cobranzas_ventas / cobranzas_cuentas / cobranzas_depositos) se
// seleccionan dinámicamente por nombre desde el caller (mapa TABLE[cobTab]),
// por lo que las funciones reciben el nombre de tabla y mantienen el
// comportamiento idéntico.

// Lista filas de una tabla cobranzas por created_at desc.
export const list = (table: TableName) =>
  supabase.from(table).select('*').order(COLUMNS.createdAt, { ascending: false })

// Inserta filas en una tabla cobranzas.
export const insert = (table: TableName, records: any[]) =>
  supabase.from(table).insert(records)
