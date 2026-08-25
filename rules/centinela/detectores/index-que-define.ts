import { lista, type Detector } from "./tipos.ts"

// Qué directorios AGRUPAN módulos (su index es un barrel) y cuáles SON el módulo
// (useTablero/, DepartmentChip/: su index es la implementación). La lista la declara la regla
// en `agrupadores:`; este default sólo evita que un check mal escrito rompa el detector.
const POR_DEFECTO = ["hooks", "utils", "components", "constants", "context", "data", "modals", "ui"]

export const indexQueDefine: Detector = (texto, path, params) => {
  const DIRS_DE_AGRUPACION = new Set(lista(params, "agrupadores", POR_DEFECTO))
  const partes = path.split("/")
  const archivo = partes.pop() ?? ""
  const carpeta = partes.pop() ?? ""
  if (archivo !== "index.ts" && archivo !== "index.tsx") return false
  if (!DIRS_DE_AGRUPACION.has(carpeta)) return false
  const cuerpo = texto.split("\n").filter((l) => {
    const t = l.trim()
    return t !== "" && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*")
  })
  // Re-exportar es `export … from '…'`; `export const X = …` DEFINE, aunque empiece igual.
  const reExporta = (l: string) => /^\s*export\s[\s\S]*\sfrom\s+['"]/.test(l)
  const importa = (l: string) => /^\s*import\s/.test(l)
  const cierre = (l: string) => /^\s*[})\]]/.test(l)
  return cuerpo.some((l) => !reExporta(l) && !importa(l) && !cierre(l))
}
