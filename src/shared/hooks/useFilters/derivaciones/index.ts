import { sameFilters, type FilterValues, type FilterDef } from '@/shared/utils'
import type { VistaFiltro } from '@/shared/data'

// Mismos escondidos, sin importar el orden: esconder A y después B no es un estado distinto de
// esconder B y después A.
const mismasClaves = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every(k => b.includes(k))

/** Con qué escondidos abre la barra: todo lo que el módulo no puso entre sus `principales`. Sin
 *  lista no esconde nada, que es como se comportaba antes de que la lista existiera. */
export const ocultosPorDefecto = <T,>(defs: FilterDef<T>[], principales?: string[]): string[] =>
  principales ? defs.filter(d => !principales.includes(d.key)).map(d => d.key) : []

/** Los `ocultos` que rigen. Los tuyos ganan; mientras no toques nada valen los de la vista que
 *  abre por defecto. «No tocaste nada» es coincidir con el default, no estar vacío: desde que el
 *  módulo declara `principales`, la barra ya abre con filtros escondidos. */
export const ocultosVigentes = (locales: string[], iniciales: string[], apertura?: VistaFiltro): string[] =>
  mismasClaves(locales, iniciales) ? apertura?.ocultos ?? locales : locales

/** ¿La vista aplicada dejó de coincidir con lo que hay en pantalla? Es lo que evita que el
 *  desplegable diga «Mi trimestre» mientras se ve otra cosa. */
export const vistaModificada = (valores: FilterValues, ocultos: string[], activa?: VistaFiltro): boolean =>
  !!activa && !(sameFilters(valores, activa.valores) && mismasClaves(ocultos, activa.ocultos))

// Las cuentas del hook que no dependen de React. Salieron de `index.ts` cuando no entró en las 50
// líneas, y de paso ganaron lo que adentro del hook no podían tener: un test — el repo no corre
// Vitest con DOM, así que lo que vive dentro de un hook no se prueba.
