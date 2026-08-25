// Corre los tests declarados dentro de cada check (líneas `test:`) y valida que toda regla
// verificable tenga su **Motivo**, sus tests y —si admite exención— su `version:`.
// Los casos viven junto a la regla; acá sólo está el loop.

import { cargar } from "./reglas.ts"
import { revisar } from "./evaluar.ts"
import { reglasCambiadasSinVersionar } from "./versionado.ts"

export function selfCheck(): number {
  const checks = cargar()
  if (!checks.length) throw new Error("no se encontró ningún <!-- check: --> en rules/*.md")
  let nTests = 0
  for (const c of checks) {
    if (!c.motivo) throw new Error(`«${c.regla}» declara un check pero no tiene **Motivo:**`)
    if (!c.tests.length) throw new Error(`«${c.regla}» declara un check pero no tiene ningún test:`)
    // Una regla que admite exención TIENE que declarar su versión. Sin ella cae al 1 por
    // defecto en silencio, y el día que haya que invalidar sus marcas no hay de dónde subir:
    // la caducidad —lo único que impide que una excusa dure para siempre— quedaría de adorno.
    if (c.exime && c.version === undefined)
      throw new Error(`«${c.regla}» declara \`exime: ${c.exime}\` pero no \`version:\`. Sin versión, sus marcas no caducan nunca.`)
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
  const sinVersionar = reglasCambiadasSinVersionar()
  if (sinVersionar.length)
    throw new Error(
      `${sinVersionar.length} regla(s) cambiaron sin subir su version:\n  ` +
        sinVersionar.join("\n  ") +
        "\nSubí la version: de cada una. Las marcas de exención firmadas contra la versión vieja tienen que revisarse.",
    )

  if (checks.some((c) => c.regla.includes("README")))
    throw new Error("el ejemplo del README se carga como check: falta ignorar los bloques ```")
  console.log(`self-check OK — ${checks.length} checks y ${nTests} tests leídos de rules/`)
  return 0
}
