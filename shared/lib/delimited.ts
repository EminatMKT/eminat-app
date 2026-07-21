// Parsing de texto delimitado (CSV/TSV/;/:) sin React. Puro y testeable.
// Reemplaza el parseCsvRow que vivía inline en ImportModal, generalizado a cualquier separador.

const SEPARATORS = [',', ';', '\t', ':'] as const

// Adivina el separador contando ocurrencias fuera de comillas en la cabecera. Default coma.
export function detectSeparator(headerLine: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, ':': 0 }
  let inQ = false
  for (const c of headerLine) {
    if (c === '"') { inQ = !inQ; continue }
    if (!inQ && c in counts) counts[c]++
  }
  let best = ',', bestN = 0
  for (const s of SEPARATORS) if (counts[s] > bestN) { best = s; bestN = counts[s] }
  return best
}

// Parser en una sola pasada, consciente de comillas a nivel REGISTRO: un salto de línea
// DENTRO de comillas es parte del campo (ej. notes multilínea), no un separador de fila —
// por eso NO se puede split('\n') primero. Soporta "" escapadas y el separador dentro de comillas.
export function parseDelimited(text: string, sep: string): { headers: string[]; rows: string[][] } {
  const norm = text.replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = [], cur = '', inQ = false
  for (let i = 0; i < norm.length; i++) {
    const c = norm[i]
    if (inQ) {
      if (c === '"') { if (norm[i + 1] === '"') { cur += '"'; i++ } else inQ = false }
      else cur += c
    } else if (c === '"') inQ = true
    else if (c === sep) { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  row.push(cur); rows.push(row) // último campo + última fila (sin \n final)
  // Descarta líneas en blanco (equivale al viejo filter(l => l.trim())): una fila de un solo
  // campo vacío = línea vacía o whitespace. Filas con separadores (',,') se conservan.
  const nonEmpty = rows.filter(r => !(r.length === 1 && r[0].trim() === ''))
  if (!nonEmpty.length) return { headers: [], rows: [] }
  return { headers: nonEmpty[0], rows: nonEmpty.slice(1) }
}
