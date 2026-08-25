// Lectura del markdown de las reglas: partirlo en secciones y sacarle el Motivo. Es la única
// pieza que entiende el FORMATO del archivo; `reglas.ts` se ocupa de qué significa cada campo.
const FENCE_RE = /```[\s\S]*?```/g

export function secciones(md: string): [string, string][] {
  // (título, cuerpo) por cada ## o ###; sin los ``` para no leer ejemplos.
  const out: [string, string][] = []
  let titulo: string | null = null
  let cuerpo: string[] = []
  for (const linea of md.replace(FENCE_RE, "").split("\n")) {
    if (/^#{2,3}\s/.test(linea)) {
      if (titulo) out.push([titulo, cuerpo.join("\n")])
      titulo = linea.replace(/^#+\s*/, "").trim()
      cuerpo = []
    } else if (titulo) cuerpo.push(linea)
  }
  if (titulo) out.push([titulo, cuerpo.join("\n")])
  return out
}

export function motivo(cuerpo: string): string {
  const m = cuerpo.match(/\*\*Motivo:?\*\*:?\s*([\s\S]+?)(?:\n\n|$)/)
  return m ? m[1].split(/\s+/).join(" ").trim() : ""
}
