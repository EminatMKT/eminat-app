/** Lo que separa los dos extremos de un rango dentro de UNA clave: `"2026-03-15..2026-04-10"`.
 *  Es el formato con el que queda escrito `vistas_filtro.valores`, así que va en un solo lugar.
 *  Un extremo vacío es un rango abierto. */
export const RANGE_SEP = '..'
