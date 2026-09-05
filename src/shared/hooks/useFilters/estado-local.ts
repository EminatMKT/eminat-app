'use client'
// `../useUserPreference` y NO `@/shared/hooks`: el barrel de hooks re-exporta `useFilters`, que
// importa este archivo, y entrar por el barrel cerraría un ciclo.
import { useUserPreference } from '../useUserPreference'
import type { FilterValues } from '@/shared/utils'

type EstadoLocal = { valores: FilterValues; ocultos: string[]; vistaId: string }
const VACIO: EstadoLocal = { valores: {}, ocultos: [], vistaId: '' }

// La mitad EFÍMERA de los filtros: qué tenés puesto ahora, qué escondiste ahora, y sobre qué
// vista estás parado. Es la contraparte de `vistas.ts`, que es la mitad guardada.
export function useEstadoLocal(ambito: string) {
  // Local porque cambia con cada tecla y se reconstruye con un click: escribirlo a la base sería
  // un round-trip por interacción. Lo que la persona NOMBRÓ —una vista— sí va a tabla, y de eso
  // se ocupa `vistas.ts`. Y `vistaId` viaja acá y no en un useState del componente para que
  // sobreviva a un F5: si no, al recargar el desplegable volvería a «Sin vista» aunque en
  // pantalla estén los filtros de una.
  const [local, setLocal] = useUserPreference<EstadoLocal>(`filtros:${ambito}`, VACIO)

  const setValor = (key: string, value: string) =>
    setLocal(p => ({ ...p, valores: { ...p.valores, [key]: value } }))

  // Recibe a dónde volver en vez de calcularlo: quién decide eso es el hook, que conoce la vista
  // de apertura y los defaults del código. Nunca se vuelve a vacío — si así fuera, «limpiar» y
  // «recargar» dejarían la pantalla en dos estados distintos.
  const limpiarA = (valores: FilterValues) => setLocal(p => ({ ...p, valores }))

  const alternarVisible = (key: string) => setLocal(p => ({
    ...p,
    ocultos: p.ocultos.includes(key) ? p.ocultos.filter(k => k !== key) : [...p.ocultos, key],
  }))

  // Elegir una vista ESCRIBE su contenido acá. Por eso la vista de apertura sólo importa en la
  // primera carga: a partir de este momento, lo que hay es lo que elegiste.
  const aplicar = (v?: { id: string; valores: FilterValues; ocultos: string[] }) =>
    setLocal(v ? { valores: v.valores, ocultos: v.ocultos, vistaId: v.id } : VACIO)

  const api = { local, setValor, limpiarA, alternarVisible, aplicar }
  return api
}
