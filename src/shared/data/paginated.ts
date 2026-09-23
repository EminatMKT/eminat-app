import { supabase } from '@/shared/db/supabase'

// PostgREST corta en `max_rows` (1000 en supabase/config.toml) y devuelve 200 OK con
// Content-Range, no un error: supabase-js no avisa nada. Sin paginar, el matcheo del
// import se calcularía contra 1.000 de 4.132 pacientes y duplicaría el resto EN SILENCIO.
const PAGE = 1000

// `columnas` existe porque `*` no puede pedir una columna casteada: un `numeric` vuelve como
// número JSON y ningún float guarda todos los centavos, así que quien maneja plata pide
// `amount::text`. Sin argumento sigue siendo `*`, que es lo que piden los demás repos.
export async function listAllRows<T>(tabla: string, orden: string, columnas = '*'): Promise<T[]> {
  const out: T[] = []
  for (let desde = 0; ; desde += PAGE) {
    const { data, error } = await supabase
      .from(tabla).select(columnas).order(orden).range(desde, desde + PAGE - 1)
    if (error) throw error
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return out
  }
}
