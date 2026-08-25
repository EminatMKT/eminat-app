// Corre los tests declarados dentro de cada check (líneas `test:`) y valida
// que toda regla verificable tenga su **Motivo**. Los casos viven junto a la
// regla; acá sólo está el loop.

import { cargar } from "./reglas.ts"
import { revisar } from "./evaluar.ts"

export function selfCheck(): number {
  const checks = cargar()
  if (!checks.length) throw new Error("no se encontró ningún <!-- check: --> en rules/*.md")
  let nTests = 0
  for (const c of checks) {
    if (!c.motivo) throw new Error(`«${c.regla}» declara un check pero no tiene **Motivo:**`)
    if (!c.tests.length) throw new Error(`«${c.regla}» declara un check pero no tiene ningún test:`)
    for (const t of c.tests) {
      nTests++
      const falla = revisar(t.path, t.contenido, t.esNuevo, [c]).length > 0
      if (falla !== t.esperaFalla)
        throw new Error(
          `«${c.regla}» test fallido: esperaba ${t.esperaFalla ? "falla" : "pasa"} para ` +
            `${JSON.stringify(t.contenido)} en ${t.path}`,
        )
    }
  }
  if (checks.some((c) => c.regla.includes("README")))
    throw new Error("el ejemplo del README se carga como check: falta ignorar los bloques ```")
  console.log(`self-check OK — ${checks.length} checks y ${nTests} tests leídos de rules/`)
  return 0
}
