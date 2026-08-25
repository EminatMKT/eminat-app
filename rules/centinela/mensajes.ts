// El mensaje que ve quien incumple una regla. Un solo formato para todos los CLIs.

export function checklist(path: string, fallan: { regla: string; motivo: string }[]): string {
  const partes = [`CHECKLIST DE REGLAS — ${path} no pasa ${fallan.length}:\n`]
  for (const { regla, motivo } of fallan) {
    partes.push(`  ✗ ${regla}`)
    if (motivo) partes.push(`    ${motivo}\n`)
  }
  partes.push(
    "Corregí el contenido y volvé a guardar. El texto completo de cada regla " +
      "está en rules/; si de verdad corresponde una excepción, decila en voz alta antes de esquivar esto.",
  )
  return partes.join("\n")
}
