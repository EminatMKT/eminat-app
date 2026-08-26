import { readFileSync } from "node:fs"
import { join } from "node:path"
import { RULES } from "../reglas.ts"
import type { Detector } from "./tipos.ts"

// Una marca de exención sólo vale si el archivo está listado en rules/EXENCIONES.md. La marca
// sola no cuesta nada —escribir una línea de comentario— y un escape gratis convierte cualquier
// regla en una sugerencia. El inventario le pone precio: agregar una excusa pasa a ser agregar
// una fila a un documento versionado que se revisa en el diff y que todos ven crecer.
export const marcaSinInventario: Detector = (texto, path) => {
  if (!/centinela-exime:/.test(texto)) return false
  let inventario = ""
  try { inventario = readFileSync(join(RULES, "EXENCIONES.md"), "utf8") } catch { return true }
  // El path del repo, sin la raíz absoluta: es como se escribe en la tabla.
  const relativo = path.replace(/^.*?(?=src\/|rules\/)/, "")
  return !inventario.includes(relativo)
}
