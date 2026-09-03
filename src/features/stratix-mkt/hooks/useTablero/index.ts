import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { ESTADO } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { useUserPreference } from '@/shared/hooks'
import { applyFilters, type FilterValues } from '@/shared/utils'
import { actividadFilters } from '@/features/stratix-mkt/utils/act-filters'
import { claveMes, periodoLargo } from '@/features/stratix-mkt/utils/periodo'
import { isExcludedFromStratix360 } from '@/features/stratix-mkt/team'

// centinela-exime: archivo-extenso@2 — son 20 derivaciones del MISMO conjunto filtrado
// (`actsFiltradas`): partirlas obligaría a recalcular el filtro en cada pedazo o a pasarlo
// de mano en mano, que es más frágil que tenerlas juntas. La responsabilidad es una sola.
// Los filtros del tablero y todo lo que se deriva de ellos: KPIs, gráficas y el conjunto
// `actsFiltradas` del que comen el Gantt y el resumen de horas.
export function useTablero() {
  const { usuario, actividades, equipo, miembrosPorId, miembrosAsignables, colorMarca } = useApp()
  const { t, intlLocale } = useT()

  // El tablero se filtra con el motor declarativo de `shared/utils/filters`, el mismo que
  // Research: antes era un `useState` con las pills de trimestre y nada más. Se recuerda entre
  // sesiones por usuario, así que el panel muestra cuántos hay activos — si no, se abre el
  // tablero con un filtro puesto de la semana pasada y las cifras no se explican.
  const [filterValues, setFilterValues] = useUserPreference<FilterValues>('stratix-act-filters', {})

  const actFilters = actividadFilters({ t, nombrePorId: miembrosPorId, intlLocale })
  const setFilterValue = (key: string, value: string) => setFilterValues(p => ({ ...p, [key]: value }))
  const clearFilters = () => setFilterValues({})
  const filtrosActivos = actFilters.filter(d => filterValues[d.key]).length
  const actsFiltradas = applyFilters(actividades, actFilters, filterValues)

  // Cross-filter: cada gráfica se calcula con todos los filtros MENOS el suyo. Si no, al
  // clickear la barra de Julio esa misma gráfica queda con una sola barra y no hay forma de
  // clickear otro mes para cambiar de selección. Los KPIs sí usan `actsFiltradas` (todos los
  // filtros): ahí el número filtrado ES el que se pide. Mismo criterio que Research.
  const exceptOwn = (key: string) => applyFilters(actividades, actFilters.filter(d => d.key !== key), filterValues)

  const totalQ = actsFiltradas.length
  const completadasQ = actsFiltradas.filter(a => a.estado === ESTADO.COMPLETADO).length
  const enProcesoQ = actsFiltradas.filter(a => a.estado === ESTADO.EN_PROCESO).length
  const pendientesQ = actsFiltradas.filter(a => a.estado === ESTADO.PENDIENTE).length
  const pctCompletado = totalQ > 0 ? Math.round((completadasQ / totalQ) * 100) : 0
  const totalHoras = Math.round(actsFiltradas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const totalDias = actsFiltradas.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)

  const hoy = new Date()
  const diasRestantes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - hoy.getDate()
  const horasDisponibles = diasRestantes * 8
  const equipoSinMi = equipo.filter(u => u.nombre !== usuario?.nombre && !isExcludedFromStratix360(u))

  // Los 12 meses de UN año: el eje no cambia de largo según el filtro, así que un mes vacío se
  // ve vacío en vez de desaparecer. El año es el del filtro de período si hay uno puesto, y el
  // corriente si no — elegir otro año es elegir un período de ese año en el panel de filtros.
  // ponytail: un selector de año propio se agrega el día que alguien quiera comparar dos años
  // lado a lado; hoy no hay dos años de datos.
  const actsPorMes = exceptOwn('periodo')
  const anioGrafica = (filterValues.periodo ?? '').slice(0, 4) || String(hoy.getFullYear())
  const datosPorMes = Array.from({ length: 12 }, (_, i) => {
    const key = `${anioGrafica}-${String(i + 1).padStart(2, '0')}`
    const delMes = actsPorMes.filter(a => claveMes(a.fecha_inicio) === key)
    return {
      mes: periodoLargo(`${key}-01`, intlLocale, 'short').split(' ')[0],
      key,
      total: delMes.length,
      completadas: delMes.filter(a => a.estado === ESTADO.COMPLETADO).length,
    }
  })
  const maxTotal = Math.max(...datosPorMes.map(d => d.total), 1)

  // Las barras salen de las marcas que las actividades REALMENTE usan, no del catálogo de las
  // ofrecibles: si se desactiva una empresa, sus actividades siguen contando en los totales de
  // arriba, así que su barra tiene que seguir acá o la suma de las barras deja de dar el total.
  // Mismo criterio que `colorMarca`, que tampoco filtra.
  const actsPorMarca = exceptOwn('empresa')
  const codigosUsados = Array.from(new Set(actsPorMarca.map(a => a.empresa)))
  const datosPorMarca = codigosUsados
    .map(codigo => ({
      codigo,
      // BrandBar tipa `color` como requerido y el catálogo lo declara opcional.
      color: colorMarca[codigo ?? ''] ?? COLOR_MARCA_FALLBACK,
      total: actsPorMarca.filter(a => a.empresa === codigo).length,
    }))
    .filter(m => m.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxMarca = Math.max(...datosPorMarca.map(d => d.total), 1)

  // El ranking y el resumen de horas son del EQUIPO, para cualquiera que tenga el módulo.
  // Antes un no-admin veía una sola fila —la suya—, así que el tablero decía "cómo vengo yo"
  // en vez de "cómo venimos". Quién entra en `miembrosAsignables` lo decide el catálogo de
  // roles, no el rol de quien mira.
  const idsTeam = miembrosAsignables.map(m => m.id)
  const datosPorMiembro = idsTeam.map(id => ({
    id,
    nombre: miembrosPorId[id] ?? '—',
    total: actsFiltradas.filter(a => a.responsable_id === id).length,
    completadas: actsFiltradas.filter(a => a.responsable_id === id && a.estado === ESTADO.COMPLETADO).length,
    horas: Math.round(actsFiltradas.filter(a => a.responsable_id === id).reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  const maxMiembro = Math.max(...datosPorMiembro.map(d => d.total), 1)

  // Horas y Gantt son bloques del TABLERO: leen del mismo conjunto que las gráficas, así que el
  // filtro los mueve a los tres a la vez. Antes cada uno tenía su propio selector —un mes acá,
  // un Week/Month/Qn allá— y podían estar mirando períodos distintos.
  const resumenHoras = idsTeam.map(id => {
    const acts = actsFiltradas.filter(a => a.responsable_id === id)
    const fila = {
      id,
      nombre: miembrosPorId[id] ?? '—',
      total: acts.length,
      completadas: acts.filter(a => a.estado === ESTADO.COMPLETADO).length,
      horas: Math.round(acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10,
      dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0),
    }
    return fila
  }).filter(r => r.total > 0)

  // Solo las que tienen fecha de entrega: sin fecha no hay barra que dibujar.
  const ganttActs = actsFiltradas
    .filter(a => a.fecha_entrega)
    .sort((a, b) => new Date(a.fecha_entrega ?? '').getTime() - new Date(b.fecha_entrega ?? '').getTime())

  const tablero = {
    actFilters, filterValues, setFilterValue, clearFilters, filtrosActivos, actsFiltradas,
    totalQ, completadasQ, enProcesoQ, pendientesQ, pctCompletado, totalHoras, totalDias,
    hoy, diasRestantes, horasDisponibles, equipoSinMi,
    datosPorMes, anioGrafica, maxTotal, datosPorMarca, maxMarca, idsTeam, datosPorMiembro, maxMiembro,
    resumenHoras, ganttActs,
  }

  return tablero
}
