import { RANGE_SEP } from '../constants'

/** Un mes 'YYYY-MM' pedido como rango: del día 1 al último REAL —`new Date(a, m, 0)`, febrero
 *  bisiesto incluido—, porque un `-31` inventado compararía bien pero llegaría al
 *  `<input type="date">` como fecha inválida. Sin mes válido, '': «este filtro no filtra». */
export default function monthRange(month: string): string {
  const [year, num] = month.split('-').map(Number)
  if (!year || !num || num < 1 || num > 12) return ''
  return `${month}-01${RANGE_SEP}${month}-${new Date(year, num, 0).getDate()}`
}

// El contramolde de `enRango`: uno lee el formato del rango y el otro lo escribe. Viven juntos
// para que no deriven — el separador y el «del 1 al último» son la misma convención vista de los
// dos lados.
//
// Existe porque los cortes del calendario no desaparecen cuando el filtro pasa a ser un rango:
// siguen siendo lo que la gente pide casi siempre, sólo que ahora como ATAJO —un clic en la barra
// de Julio de la gráfica— y no como el único modo de elegir. Eso es lo que separa a un desplegable
// de meses de un rango con accesos rápidos.
