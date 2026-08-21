// Lector de .xlsx genérico: no sabe qué es un paciente ni un lead, solo lee hojas y filas.
//
// La librería (2,4 MB) se importa de forma DINÁMICA adentro de cada función — no al tope del
// archivo — para que no entre al bundle principal de una pantalla que se usa una vez por mes.
// Eso vuelve `parseWorkbook` y `readSheet` asíncronas.
//
// Todas las celdas salen como STRING CRUDO, sin convertir fechas ni números: `cellDates: false`
// + `raw: false` en `sheet_to_json` fuerza el formato de texto de la celda tal como está en el
// archivo (un serial de Excel como '39872', no un objeto Date). La clave de identidad del import
// se calcula sobre ese crudo, así que convertir acá cambiaría el formato de la clave y el import
// dejaría de reconocer las filas ya cargadas.

export async function parseWorkbook(buf: ArrayBuffer): Promise<{ hojas: string[] }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true })
  return { hojas: wb.SheetNames }
}

export async function readSheet(
  buf: ArrayBuffer,
  hoja: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true })
  const sheet = wb.Sheets[hoja]
  if (!sheet) return { headers: [], rows: [] }

  const [headers, ...rows] = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  })
  return { headers: headers ?? [], rows }
}
