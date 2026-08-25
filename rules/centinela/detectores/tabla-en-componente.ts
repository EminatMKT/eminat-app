export function tablaEnComponente(texto: string): boolean {
  // Un array literal asignado con seis o más elementos-objeto: eso es una TABLA
  // DE DATOS, y adentro de un .tsx tapa el JSX. Cuenta las llaves que abren en el
  // nivel inmediato del array, así un objeto anidado no infla la cuenta.
  for (let i = 1; i < texto.length; i++) {
    if (texto[i] !== "[") continue
    if (!/=\s*$/.test(texto.slice(Math.max(0, i - 4), i))) continue
    let nivel = 0
    let elementos = 0
    for (let j = i; j < texto.length; j++) {
      const ch = texto[j]
      if (ch === "[" || ch === "{" || ch === "(") {
        if (ch === "{" && nivel === 1) elementos++
        nivel++
      } else if (ch === "]" || ch === "}" || ch === ")") {
        nivel--
        if (nivel === 0) break
      }
    }
    if (elementos >= 6) return true
  }
  return false
}
