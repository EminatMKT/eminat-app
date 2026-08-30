// Fecha calendario (YYYY-MM-DD) en la zona horaria de QUIEN MIRA, no en UTC.
//
// `toISOString().split('T')[0]` es la trampa: convierte a UTC primero. En UTC-4, desde las 20:00
// devuelve el día siguiente — la agenda de Medical mostraba las citas de mañana como las de hoy,
// y una actividad cargada a la noche quedaba con fecha de mañana. `sv-SE` se usa porque su
// formato local ES `YYYY-MM-DD`, que es además el formato de las columnas `date` de Postgres.
export function localDate(d: Date = new Date()): string {
  return d.toLocaleDateString('sv-SE')
}

// Mes calendario local (YYYY-MM), para comparar contra el prefijo de una columna `date`.
export function localMonth(d: Date = new Date()): string {
  return localDate(d).slice(0, 7)
}

// Una fecha calendario `YYYY-MM-DD` como la lee una persona: "29 ago 2026" / "Aug 29, 2026".
//
// Parte el string a mano en vez de `new Date(fecha)` — que es la misma trampa de arriba al
// revés: el constructor interpreta 'YYYY-MM-DD' como UTC, así que en UTC-4 muestra el día
// ANTERIOR. Comprobado: `new Date('2026-08-29')` se imprime 28/8/2026.
//
// `intlLocale` se pasa como parámetro y no se deduce acá: este módulo no sabe de idiomas. Sale
// de `useT().intlLocale`, que es donde vive el mapa de BCP-47.
export function fechaCorta(fecha: string, intlLocale: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  if (!anio || !mes || !dia) return fecha || '—'
  const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
  return new Date(anio, mes - 1, dia).toLocaleDateString(intlLocale, opciones)
}

// Una hora `HH:MM` o `HH:MM:SS` de una columna `time`, en el formato del idioma de quien mira.
//
// Reemplaza al `hora.slice(0, 5)` que estaba escrito en la fila del listado: cortar el string
// imprime SIEMPRE 24h, así que en inglés se leía "15:00" donde corresponde "3:00 PM". Que sea
// 12h o 24h no es una decisión nuestra: la trae el locale.
//
// La fecha del `Date` es de descarte —sólo hace falta para que `Intl` formatee una hora—, y por
// eso es una constante y no `new Date()`: con la fecha de hoy, un cambio de horario de verano
// podría correr la hora.
export function horaCorta(hora: string, intlLocale: string): string {
  const [h, m] = hora.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return hora || '—'
  const opciones: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(intlLocale, opciones)
}
