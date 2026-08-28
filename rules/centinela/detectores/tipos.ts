// Un detector mira UN archivo y dice si dispara. `params` trae los números y listas que declara
// el bloque `check:` de la regla — el umbral, el catálogo de directorios— para que no vivan
// hardcodeados acá: el motor no contiene reglas, las lee de rules/*.md.
export type Detector = (texto: string, path: string, params?: Record<string, string>) => boolean

// Lee un parámetro numérico de la regla, con el valor por defecto si no lo declara.
export const num = (params: Record<string, string> | undefined, clave: string, porDefecto: number): number => {
  const v = Number(params?.[clave])
  return Number.isFinite(v) ? v : porDefecto
}

// Lee un parámetro de lista separada por comas.
export const lista = (params: Record<string, string> | undefined, clave: string, porDefecto: string[]): string[] => {
  const v = params?.[clave]
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : porDefecto
}
