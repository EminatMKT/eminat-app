import { useMemo } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useUserPreference } from '@/shared/hooks'
import { resolveFilterValues, defaultFilterValues, type FilterValues } from '@/shared/utils'
import { actividadFilters } from '@/features/tasks/utils/act-filters'
import { departamentoPorUsuario } from '@/features/tasks/utils/departamento'

// Los filtros del tablero: los defs, los valores efectivos y cómo se cambian. Sale de
// `useTablero` porque ese archivo ya estaba en el techo de 150 líneas y esto le sumaba tres
// derivaciones más — no por diseño, sino para no dejarlo peor de como se encontró.
export function useFiltrosTablero() {
  const { usuario, usuarios, equipos, departamentos, miembrosPorId } = useApp()
  const { t, intlLocale } = useT()

  // El tablero se filtra con el motor declarativo de `shared/utils/filters`, el mismo que
  // Research. Se recuerda entre sesiones por usuario, así que el panel muestra cuántos hay
  // activos — si no, se abre el tablero con un filtro puesto de la semana pasada y las cifras
  // no se explican.
  const [guardados, setFilterValues] = useUserPreference<FilterValues>('stratix-act-filters', {})

  const departamentoPorResponsable = useMemo(
    () => departamentoPorUsuario(usuarios, equipos), [usuarios, equipos])
  const nombreDepartamento = useMemo(
    () => Object.fromEntries(departamentos.map(d => [d.id, d.nombre])), [departamentos])
  const departamentoPropio = usuario?.id ? departamentoPorResponsable[usuario.id] : undefined

  // `actFilters` va memoizado y NO es opcional: sin esto se recrea en cada render, y como es la
  // entrada de `resolveFilterValues` y de los seis `applyFilters` del tablero, arrastra a todos.
  const actFilters = useMemo(() => actividadFilters({
    t, nombrePorId: miembrosPorId, intlLocale,
    departamentoPorResponsable, nombreDepartamento, departamentoPropio,
  }), [t, miembrosPorId, intlLocale, departamentoPorResponsable, nombreDepartamento, departamentoPropio])

  // Lo guardado gana; lo que nunca se tocó toma su default. Un filtro puesto en «Todas» guarda
  // la cadena vacía y ESO se respeta: si no, quitar el área y recargar la volvería a poner.
  const filterValues = useMemo(() => resolveFilterValues(actFilters, guardados), [actFilters, guardados])
  const setFilterValue = (key: string, value: string) => setFilterValues(p => ({ ...p, [key]: value }))
  // El clear vuelve a los DEFAULTS, no a vacío: si volviera a `{}`, «limpiar» y «recargar»
  // dejarían el tablero en dos estados distintos.
  const clearFilters = () => setFilterValues(defaultFilterValues(actFilters))
  const filtrosActivos = actFilters.filter(d => filterValues[d.key]).length

  const filtros = { actFilters, filterValues, setFilterValue, clearFilters, filtrosActivos }
  return filtros
}
