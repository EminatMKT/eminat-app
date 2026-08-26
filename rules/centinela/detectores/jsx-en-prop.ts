export function jsxEnProp(texto: string): boolean {
  // JSX pasado como valor de una prop con TRES O MÁS elementos adentro: eso es
  // estructura, o sea un componente escrito dentro de la llamada a otro. Se cuenta
  // por elementos y no por líneas porque una sola llamada a componente puede ocupar
  // seis renglones por sus props (`header={<Header a={1} b={2} />}`) y está bien.
  for (const m of texto.matchAll(/\w+=\{\s*\n?\s*</g)) {
    const inicio = texto.indexOf("{", m.index!)
    let nivel = 0
    let fin = inicio
    for (let j = inicio; j < texto.length; j++) {
      if (texto[j] === "{") nivel++
      else if (texto[j] === "}") {
        nivel--
        if (nivel === 0) { fin = j; break }
      }
    }
    const elementos = texto.slice(inicio, fin).match(/<[A-Za-z]/g)?.length ?? 0
    if (elementos >= 3) return true
  }
  return false
}
