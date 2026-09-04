// A qué mes se imputa una actividad en el reporte de pago. Todo sale de `fecha_inicio`.
//
// Antes era la columna `mes`, un texto: 'Agosto', el mes SIN el año. El reporte filtraba con
// `mes === 'Agosto'` y por lo tanto sumaba ese mes de todos los años; en enero de 2027 el reporte
// de Enero habría incluido enero de 2026 y se habría leído como que la persona trabajó el doble.
// Sale impreso en un pago (ver docs/superpowers/specs/2026-08-31-fecha-inicio-design.md).
//
// `trimestre` también era una columna, y una columna derivada sólo puede desincronizarse: 45 de
// las 329 filas de producción tenían marzo marcado Q2. Acá se calcula.

// La clave de agrupación, 'YYYY-MM'. Es lo que compara el reporte y lo que guarda el filtro: el
// día no aporta al período y tenerlo obligaría a normalizarlo en cada comparación.
export const claveMes = (fecha: string | null | undefined): string => (fecha ?? '').slice(0, 7)

// Q1..Q4 del mes de la fecha.
export function trimestreDe(fecha: string | null | undefined): string {
  const mes = Number(claveMes(fecha).slice(5, 7))
  return mes >= 1 && mes <= 12 ? `Q${Math.floor((mes - 1) / 3) + 1}` : ''
}

// "agosto 2026" / "August 2026". Antes `{a.mes}` imprimía 'Agosto' aunque la app estuviera en
// inglés. `intlLocale` entra por parámetro por lo mismo que en `fechaCorta`: este módulo no sabe
// de idiomas — sale de `useT().intlLocale`.
//
// Parte el string a mano en vez de `new Date(fecha)`: el constructor interpreta 'YYYY-MM-DD' como
// UTC, así que en UTC-5 un 1 de enero se imprime como diciembre del año anterior.
export function periodoLargo(
  fecha: string | null | undefined,
  intlLocale: string,
  mes: 'long' | 'short' = 'long',
): string {
  const [anio, num] = claveMes(fecha).split('-').map(Number)
  if (!anio || !num || num < 1 || num > 12) return '—'
  return new Date(anio, num - 1, 1).toLocaleDateString(intlLocale, { month: mes, year: 'numeric' })
}

// Lo que ofrecen los desplegables de período: los 12 meses de cada año presente en los datos.
// Los 12 y no los que tienen tareas, por lo mismo de siempre — el tablero se usa para ver que un
// mes está VACÍO, y una opción que desaparece cuando no hay tareas no permite preguntarlo.
export function periodosDisponibles(fechas: (string | null | undefined)[]): string[] {
  const anios = new Set(fechas.map(f => claveMes(f).slice(0, 4)).filter(Boolean))
  if (!anios.size) anios.add(String(new Date().getFullYear()))
  // `Array.from` y no `[...anios]`: el target de este tsconfig no permite iterar un Set con spread.
  return Array.from(anios).sort().flatMap(a =>
    Array.from({ length: 12 }, (_, i) => `${a}-${String(i + 1).padStart(2, '0')}`))
}
