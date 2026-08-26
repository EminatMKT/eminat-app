export function centinelaSinFiltro(texto: string): boolean {
  // El "sin filtro" escrito a mano: `useState('All')`, `x === 'Todos'`. Se mira
  // el USO, no la declaración —la constante tiene que poder existir en algún
  // lado— y se saltan los comentarios, donde el literal es sólo una mención.
  const uso = /(useState[<(]|[=!]==\s*)\s*['"](All|all|ALL|Todos|Todas|Todo|General|Ninguno|None)['"]/
  for (const linea of texto.split("\n")) {
    const l = linea.trim()
    if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) continue
    if (uso.test(linea)) return true
  }
  return false
}
