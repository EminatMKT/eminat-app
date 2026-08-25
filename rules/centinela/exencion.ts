// La marca de exención versionada: `// centinela-exime: <clave>@<version> — <razón>`.
// El mecanismo completo está en rules/proceso.md · "La marca".

// Una marca `// centinela-exime: <clave>@<version> — <razón>` en el archivo.
// Devuelve la versión declarada, o null si no hay marca válida.
// Exige las tres partes: la clave, la versión y una razón con texto. Sin razón no exime —
// lo que la marca protege no es el número, es que la decisión quede escrita.
export function versionDeExencion(texto: string, clave: string): number | null {
  const re = new RegExp(`centinela-exime:\\s*${clave}@(\\d+)\\s*[—-]\\s*(\\S[^\\n]*)`)
  const m = texto.match(re)
  return m && m[2].trim().length > 0 ? Number(m[1]) : null
}
