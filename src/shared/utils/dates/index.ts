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
