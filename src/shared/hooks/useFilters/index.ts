'use client'
import { useMemo } from 'react'
// `../useUserPreference` y NO `@/shared/hooks`: este archivo lo re-exporta el barrel de hooks, y
// entrar por el barrel cerraría un ciclo. Mismo criterio que documenta `shared/utils/index.ts`.
import { useUserPreference } from '../useUserPreference'
import { resolveFilterValues, defaultFilterValues, visibleDefs, type FilterDef, type FilterValues } from '@/shared/utils'
import { ocultosVigentes, vistaModificada } from './derivaciones'
import type { Filtros } from './tipos'
import { useVistas } from './vistas'

type EstadoLocal = { valores: FilterValues; ocultos: string[]; vistaId: string }
const VACIO: EstadoLocal = { valores: {}, ocultos: [], vistaId: '' }

// Los filtros de una tabla: el motor, el estado vivo y las vistas guardadas, en un contrato.
// `ambito` identifica qué se filtra y separa tanto la clave de localStorage como las filas de
// `vistas_filtro`. Sale del catálogo de módulos, no de un literal escrito a mano.
export function useFilters<T>(ambito: string, defs: FilterDef<T>[]): Filtros<T> {
  // Va a localStorage y no a la tabla porque cambia con cada tecla: qué tenés puesto ahora, qué
  // escondiste ahora, y sobre qué vista estás parado. Escribirlo a la base sería un round-trip
  // por interacción, y se reconstruye con un click. Lo que la persona NOMBRÓ —una vista— sí va a
  // tabla, y de eso se ocupa `useVistas`.
  //
  // `vistaId` viaja acá y no en un useState del componente para que sobreviva a un F5: si no, al
  // recargar el desplegable volvería a «Sin vista» aunque en pantalla estén los filtros de una.
  const [local, setLocal] = useUserPreference<EstadoLocal>(`filtros:${ambito}`, VACIO)
  const { vistas, guardar, actualizar, borrar, marcarPorDefecto } = useVistas(ambito)

  // La vista de apertura es la TERCERA capa, debajo de lo que tocaste: pesa en la primera carga
  // y deja de pesar en cuanto tocás algo, porque `local.valores` la pisa clave por clave.
  const apertura = vistas.find(v => v.abre_por_defecto)
  const valores = useMemo(
    () => resolveFilterValues(defs, local.valores, apertura?.valores), [defs, local.valores, apertura])
  const ocultos = ocultosVigentes(local.ocultos, apertura)
  const visibles = useMemo(() => visibleDefs(defs, ocultos), [defs, ocultos])

  const setValor = (key: string, value: string) =>
    setLocal(p => ({ ...p, valores: { ...p.valores, [key]: value } }))
  // Limpiar vuelve a la vista de apertura si hay una, y a los defaults del código si no. Nunca a
  // vacío: si volviera a vacío, «limpiar» y «recargar» dejarían la pantalla en dos estados.
  const limpiar = () =>
    setLocal(p => ({ ...p, valores: apertura?.valores ?? defaultFilterValues(defs) }))
  const alternarVisible = (key: string) => setLocal(p => ({
    ...p,
    ocultos: p.ocultos.includes(key) ? p.ocultos.filter(k => k !== key) : [...p.ocultos, key],
  }))
  // Elegir una vista ESCRIBE su contenido en el estado local. Por eso `apertura` sólo importa en
  // la primera carga: a partir de acá, lo que hay es lo que elegiste.
  const aplicarVista = (id: string) => {
    const v = vistas.find(x => x.id === id)
    setLocal(v ? { valores: v.valores, ocultos: v.ocultos, vistaId: v.id } : VACIO)
  }

  // `vistaActivaId` sale de `activa?.id` y no de `local.vistaId`: si la vista se borró desde otra
  // pestaña, el id guardado apunta a algo que ya no está y el `<select>` quedaría con un valor
  // que no existe entre sus opciones — que en HTML se dibuja en blanco, sin explicación.
  const activa = vistas.find(v => v.id === local.vistaId)

  const filtros: Filtros<T> = {
    defs, visibles, valores, ocultos, vistas,
    activos: visibles.filter(d => valores[d.key]).length,
    vistaActivaId: activa?.id ?? '',
    modificada: vistaModificada(valores, ocultos, activa),
    setValor, limpiar, alternarVisible, aplicarVista,
    guardarVista: (nombre: string) => guardar(nombre, valores, ocultos),
    actualizarVista: (id: string) => actualizar(id, valores, ocultos),
    borrarVista: borrar,
    marcarPorDefecto,
  }
  return filtros
}
