export function objetoLiteralEnReturn(texto: string): boolean {
  // `return { … }` con cuatro campos o más: ese objeto es el contrato de la función y se arma
  // en una variable con nombre. Se cuenta por CAMPOS (comas del nivel superior) y no por
  // líneas, así el umbral es el mismo escriba uno el objeto en una línea o en diez.
  // Sólo el `return` del nivel de la función (0-2 espacios de indentación): el contrato es lo
  // que la función devuelve, no lo que arma un callback de .map() adentro suyo.
  for (const m of texto.matchAll(/(?:^|\n) {0,2}return\s*\{/g)) {
    const inicio = texto.indexOf("{", m.index!)
    let nivel = 0
    let campos = 1
    for (let j = inicio; j < texto.length; j++) {
      const ch = texto[j]
      if (ch === "{" || ch === "[" || ch === "(") nivel++
      else if (ch === "}" || ch === "]" || ch === ")") {
        nivel--
        if (nivel === 0) break
      } else if (ch === "," && nivel === 1) campos++
    }
    if (campos >= 4) return true
  }
  return false
}
