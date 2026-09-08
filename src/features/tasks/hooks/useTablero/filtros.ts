'use client'
import { useMemo } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useFilters } from '@/shared/hooks'
import { MODULE } from '@/shared/auth/permissions'
import { actividadFilters } from '@/features/tasks/utils/act-filters'
import { departamentoPorUsuario } from '@/features/tasks/utils/departamento'

// Con cuáles abre la barra. Los otros cuatro —trimestre, período, responsable, área— siguen
// existiendo y los ofrece el «+ Filtro»: una fila de seis controles se lee como un formulario,
// y en la práctica el tablero se recorta por estado y por marca.
const PRINCIPALES = ['estado', 'empresa']

/** Los filtros del tablero. La mecánica —valores, vistas, qué se ve— es la compartida; lo propio
 *  del módulo son los tres mapas del área, que salen de los catálogos de organización. */
export function useFiltrosTablero() {
  const { usuario, usuarios, equipos, departamentos, miembrosPorId } = useApp()
  const { t, intlLocale } = useT()

  const departamentoPorResponsable = useMemo(
    () => departamentoPorUsuario(usuarios, equipos), [usuarios, equipos])
  const nombreDepartamento = useMemo(
    () => Object.fromEntries(departamentos.map(d => [d.id, d.nombre])), [departamentos])
  const departamentoPropio = usuario?.id ? departamentoPorResponsable[usuario.id] : undefined

  // `actFilters` va memoizado y NO es opcional: sin esto se recrea en cada render, y como es la
  // entrada de `useFilters` y de los seis `applyFilters` del tablero, arrastra a todos.
  const actFilters = useMemo(() => actividadFilters({
    t, nombrePorId: miembrosPorId, intlLocale,
    departamentoPorResponsable, nombreDepartamento, departamentoPropio,
  }), [t, miembrosPorId, intlLocale, departamentoPorResponsable, nombreDepartamento, departamentoPropio])

  // El ámbito sale del catálogo de módulos y no de un literal: separa tanto la clave de
  // localStorage como las filas de `vistas_filtro`, y escrito a mano un typo no rompe el build
  // — sólo deja de coincidir, y las vistas guardadas dejan de aparecer sin decir por qué.
  return useFilters(MODULE.TASKS, actFilters, PRINCIPALES)
}
