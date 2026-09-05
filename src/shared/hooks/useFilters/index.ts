'use client'
import { useMemo } from 'react'
import { resolveFilterValues, defaultFilterValues, visibleDefs, type FilterDef } from '@/shared/utils'
import { ocultosVigentes, vistaModificada } from './derivaciones'
import { useEstadoLocal } from './estado-local'
import type { Filtros } from './tipos'
import { useVistas } from './vistas'

// Los filtros de una tabla: el motor, el estado vivo y las vistas guardadas, en un contrato.
// Este archivo es el CABLEADO y nada más — la mitad efímera vive en `estado-local`, la guardada
// en `vistas`, y las cuentas puras en `derivaciones`.
//
// `ambito` identifica qué se filtra y separa tanto la clave de localStorage como las filas de
// `vistas_filtro`. Sale del catálogo de módulos, no de un literal escrito a mano.
export function useFilters<T>(ambito: string, defs: FilterDef<T>[]): Filtros<T> {
  const { local, setValor, limpiarA, alternarVisible, aplicar } = useEstadoLocal(ambito)
  const { vistas, guardar, actualizar, borrar, marcarPorDefecto } = useVistas(ambito)

  // La vista de apertura es la TERCERA capa, debajo de lo que tocaste: pesa en la primera carga
  // y deja de pesar en cuanto tocás algo, porque `local.valores` la pisa clave por clave.
  const apertura = vistas.find(v => v.abre_por_defecto)
  const valores = useMemo(
    () => resolveFilterValues(defs, local.valores, apertura?.valores), [defs, local.valores, apertura])
  const ocultos = ocultosVigentes(local.ocultos, apertura)
  const visibles = useMemo(() => visibleDefs(defs, ocultos), [defs, ocultos])

  // `vistaActivaId` sale de `activa?.id` y no de `local.vistaId`: si la vista se borró desde otra
  // pestaña, el id guardado apunta a algo que ya no está y el `<select>` quedaría con un valor
  // que no existe entre sus opciones — que en HTML se dibuja en blanco, sin explicación.
  const activa = vistas.find(v => v.id === local.vistaId)

  const filtros: Filtros<T> = {
    defs, visibles, valores, ocultos, vistas,
    activos: visibles.filter(d => valores[d.key]).length,
    vistaActivaId: activa?.id ?? '',
    modificada: vistaModificada(valores, ocultos, activa),
    setValor,
    limpiar: () => limpiarA(apertura?.valores ?? defaultFilterValues(defs)),
    alternarVisible,
    aplicarVista: (id: string) => aplicar(vistas.find(v => v.id === id)),
    guardarVista: (nombre: string) => guardar(nombre, valores, ocultos),
    actualizarVista: (id: string) => actualizar(id, valores, ocultos),
    borrarVista: borrar,
    marcarPorDefecto,
  }
  return filtros
}
