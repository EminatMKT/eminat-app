// El puente hacia la columna `mes` mientras siga existiendo. Va en su propio archivo porque es
// transitorio: la fase 2 borra la columna y este archivo se borra entero con ella, sin tener que
// desenredarlo de nada. Si viviera dentro de `periodo/index.ts` habría que ir a buscarlo.
//
// `mes` es `text` con un CHECK de estos doce valores exactos, así que el nombre se escribe en
// español y sin `Intl`: no es texto que alguien lea, es el valor que el CHECK admite.
import { claveMes } from './index'

const MESES_TESTIGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const mesTestigo = (fecha: string | null | undefined): string | null =>
  MESES_TESTIGO[Number(claveMes(fecha).slice(5, 7)) - 1] ?? null
