import type { Falla } from "./tipos.ts"

// El mensaje que ve quien incumple una regla. Un solo formato para todos los CLIs.
// Cuando la regla admite exención, dice la firma EXACTA que habría que estampar —con su
// versión vigente— porque firmar con la versión equivocada no vale y no se entiende por qué.
// Decirla no es dar permiso: al lado va lo que cuesta, que es la fila en el inventario.
export function checklist(path: string, fallan: Falla[]): string {
  const partes = [`CHECKLIST DE REGLAS — ${path} no pasa ${fallan.length}:\n`]
  for (const { regla, motivo, firma } of fallan) {
    partes.push(`  ✗ ${regla}`)
    if (motivo) partes.push(`    ${motivo}\n`)
    if (firma) {
      partes.push(`    Si de verdad corresponde la excepción, se firma así — y NO vale sin las dos partes:`)
      partes.push(`      1. en el archivo:  // centinela-exime: ${firma} — <por qué, en serio>`)
      partes.push(`      2. en rules/EXENCIONES.md: una fila con este archivo y esta regla\n`)
    }
  }
  partes.push(
    "Corregí el contenido y volvé a guardar. El texto completo de cada regla " +
      "está en rules/; si de verdad corresponde una excepción, decila en voz alta antes de esquivar esto.",
  )
  return partes.join("\n")
}
