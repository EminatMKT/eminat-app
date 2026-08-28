export function reglaSinCheck(texto: string): boolean {
  // Cada sección `## ` de un archivo de reglas lleva o su `<!-- check:` o una
  // exención `<!-- sin check: <razón> -->` (rules/README.md · "toda regla nueva
  // intenta nacer con su check"). Sin ninguno de los dos = regla que se olvidó.
  // El encabezado cuenta como parte de su sección: el marcador puede ir al pie
  // del título.
  let cuerpo: string | null = null
  for (const linea of texto.split("\n")) {
    if (/^##\s/.test(linea)) {
      if (cuerpo !== null && !cuerpo.includes("<!-- check") && !cuerpo.includes("<!-- sin check:")) return true
      cuerpo = ""
    }
    if (cuerpo !== null) cuerpo += linea + "\n"
  }
  return cuerpo !== null && !cuerpo.includes("<!-- check") && !cuerpo.includes("<!-- sin check:")
}
