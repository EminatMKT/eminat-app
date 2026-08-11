// Deriva de `empresas` lo que Stratix necesita, reemplazando la constante
// hardcodeada MARCAS_LIST.

type E = {
  codigo: string
  color?: string
  activo?: boolean
  recibe_actividades?: boolean
}

// El violeta que devolvía getColorMarca cuando un código no estaba en la lista.
export const COLOR_MARCA_FALLBACK = '#7C6FF7'

// Las empresas ofrecibles al crear una actividad. `activo` es el interruptor
// maestro y `recibe_actividades` un permiso que solo aplica sobre una activa; se
// chequean los dos porque la invariante la impone la UI, no la base.
export function deriveMarcas<T extends E>(empresas: T[]): T[] {
  return empresas.filter(e => e.activo && e.recibe_actividades)
}

// codigo -> color de TODAS las empresas, sin filtrar. Una actividad de una
// empresa desactivada o no atribuible se sigue pintando con su color: el
// histórico no se reescribe cuando cambia la configuración.
export function deriveColorMarca(empresas: E[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const e of empresas) if (e.color) map[e.codigo] = e.color
  return map
}
