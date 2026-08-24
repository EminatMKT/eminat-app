// Lector de .xlsx genérico: no sabe qué es un paciente ni un lead, solo lee hojas y filas.
//
// La librería (2,4 MB) se importa de forma DINÁMICA adentro de cada función — no al tope del
// archivo — para que no entre al bundle principal de una pantalla que se usa una vez por mes.
// Eso vuelve `parseWorkbook` y `readSheet` asíncronas.
//
// Todas las celdas salen como STRING CRUDO, sin convertir fechas ni números. La clave de
// identidad del import se calcula sobre ese crudo, así que convertir acá cambiaría el formato
// de la clave y el import dejaría de reconocer las filas ya cargadas.
//
// `cellText: false` es la mitad no obvia de esto. Con `cellText` en su default (true), SheetJS
// precalcula el texto formateado de CADA celda (`.w`) al leer el archivo, y `sheet_to_json` con
// `raw: false` usa ese `.w` cacheado sin mirar `cellDates` — con lo cual, para una celda de fecha
// que SÍ tiene formato de fecha aplicado en el archivo, `cellDates` no cambia nada: el texto sale
// formateado ('2/28/09') pase lo que pase. `cellText: false` apaga ese cacheo y obliga a
// `sheet_to_json` a derivar el texto desde el valor crudo de la celda (`.v` + su tipo), que es
// donde `cellDates` sí decide si ese valor es un serial numérico o un `Date` ya convertido. Sin
// las dos opciones juntas (`cellDates: false` Y `cellText: false`), una celda de fecha con
// formato real en el archivo sale formateada en vez de cruda, aunque el test con un número sin
// formato (como el de este módulo) no lo delate.

const FIRMA_ZIP = [0x50, 0x4b, 0x03, 0x04] // 'PK\x03\x04' — todo .xlsx es un ZIP

function esZip(buf: ArrayBuffer): boolean {
  if (buf.byteLength < FIRMA_ZIP.length) return false
  const bytes = new Uint8Array(buf, 0, FIRMA_ZIP.length)
  return FIRMA_ZIP.every((b, i) => bytes[i] === b)
}

async function leerWorkbook(buf: ArrayBuffer) {
  if (!esZip(buf)) {
    throw new Error(
      'El archivo no es un .xlsx válido: no tiene la firma de un ZIP. ' +
        'Puede ser un .csv renombrado, una descarga corrupta u otro formato.'
    )
  }
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: true, cellText: false })
  return { XLSX, wb }
}

export async function parseWorkbook(buf: ArrayBuffer): Promise<{ hojas: string[] }> {
  const { wb } = await leerWorkbook(buf)
  return { hojas: wb.SheetNames }
}

export async function readSheet(
  buf: ArrayBuffer,
  hoja: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const { XLSX, wb } = await leerWorkbook(buf)
  const sheet = wb.Sheets[hoja]
  if (!sheet) {
    throw new Error(`La hoja "${hoja}" no existe en este workbook.`)
  }

  const [headers, ...rows] = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  })
  return { headers: headers ?? [], rows }
}
