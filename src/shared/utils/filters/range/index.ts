import { RANGE_SEP } from './constants'

/** ¿Esta fecha cae en el rango `"desde..hasta"`? Cualquiera de los dos extremos puede venir
 *  vacío: eso es un rango abierto de ese lado. */
export default function enRango(value: string, fecha: string | null | undefined): boolean {
  const dia = (fecha ?? '').slice(0, 10)
  if (!dia) return false
  const [ini = '', fin = ''] = value.split(RANGE_SEP)
  return (!ini || dia >= ini) && (!fin || dia <= fin)
}

// El predicado del `kind: 'dateRange'`: una columna de fecha se filtra por rango y no por un
// desplegable de meses o trimestres, que no sabe pedir «del 15 de marzo al 10 de abril».
//
// El rango entero va en UNA clave, separado por `RANGE_SEP`, y no en dos. Con dos claves —como
// estaban los dos `kind: 'date'` sueltos de Research— el motor cuenta dos filtros activos donde
// hay uno, el «+ Filtro» ofrece esconder medio rango, y nada impide invertir los extremos. Con
// una, `FilterValues` sigue siendo `Record<string, string>`: ni `vistas_filtro.valores` ni
// `sameFilters` ni las vistas guardadas cambian de forma.
//
// La comparación es lexicográfica sobre 'YYYY-MM-DD', que para ese formato ordena igual que
// cronológicamente — es lo que ya hacían los dos controles sueltos, y sin construir un `Date`,
// que interpreta esa cadena como UTC y en UTC-5 corre el día. Una fila sin fecha queda FUERA
// del rango, también como antes: no está «entre» nada, y devolverla al filtrar por fechas
// sería la sorpresa.
