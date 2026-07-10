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

// Parser de una fila tolerante a comillas y "" escapadas dentro de campos.
function parseRow(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false }
      else cur += c
    } else if (c === '"') inQ = true
    else if (c === sep) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

export function parseDelimited(text: string, sep: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  return { headers: parseRow(lines[0], sep), rows: lines.slice(1).map(l => parseRow(l, sep)) }
}
