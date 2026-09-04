import { sameFilters, type FilterValues } from '@/shared/utils'
import type { VistaFiltro } from '@/shared/data'

// Las dos cuentas del hook que no dependen de React. Salieron de `index.ts` cuando no entró en
// las 50 líneas, y de paso ganaron lo que adentro del hook no podían tener: un test — el repo no
// corre Vitest con DOM, así que lo que vive dentro de un hook no se prueba.

// Los `ocultos` que rigen. Los tuyos ganan; si no escondiste nada, valen los de la vista que abre
// por defecto. Se mira `length` y no la identidad del array porque «no escondí nada» y «la vista
// no esconde nada» son el mismo estado en pantalla.
export const ocultosVigentes = (locales: string[], apertura?: VistaFiltro): string[] =>
  locales.length ? locales : apertura?.ocultos ?? []

// ¿La vista aplicada dejó de coincidir con lo que hay en pantalla? Es lo que evita que el
// desplegable diga «Mi trimestre» mientras se ve otra cosa.
//
// Los `ocultos` se comparan como CONJUNTOS: el orden en que escondiste dos filtros no es un
// cambio, y compararlos como listas marcaría la vista modificada por haberlos tocado al revés.
export const vistaModificada = (valores: FilterValues, ocultos: string[], activa?: VistaFiltro): boolean =>
  !!activa && !(
    sameFilters(valores, activa.valores) &&
    ocultos.length === activa.ocultos.length && ocultos.every(k => activa.ocultos.includes(k))
  )
