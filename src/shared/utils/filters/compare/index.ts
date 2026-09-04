import type { FilterValues } from '../types'

// ¿Estos dos conjuntos de filtros muestran lo mismo? Es lo que deja saber si la pantalla sigue
// siendo la vista que elegiste o si la tocaste encima — sin esto, el desplegable diría «Mi
// trimestre» mientras se ve otra cosa, que es peor que no tener la etiqueta.
//
// Una clave ausente y una clave en '' cuentan como IGUALES: las dos significan «este filtro no
// filtra». Sin esa equivalencia, aplicar una vista y no tocar nada la marcaría como modificada
// apenas el motor rellene una clave con cadena vacía.
//
// Vive aparte de `defaults/` a propósito: comparar dos estados no es calcular uno. Juntos, el
// archivo de los valores por defecto pasaba de las 50 líneas por algo que no tiene que ver.
// Las claves van sin deduplicar: una repetida sólo se compara dos veces con el mismo resultado,
// y un `Set` acá pedía `downlevelIteration` por ahorrar nada.
export function sameFilters(a: FilterValues, b: FilterValues): boolean {
  const claves = [...Object.keys(a), ...Object.keys(b)]
  return claves.every(k => (a[k] ?? '') === (b[k] ?? ''))
}
