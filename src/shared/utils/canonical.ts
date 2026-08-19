// Resolutor genérico: mapea un texto libre a un valor canónico de un conjunto conocido, vía
// match exacto (case-insensitive), tabla de alias, o un derivador a medida. null = no reconocido.
// Sirve para cualquier mapeo texto→valor válido: encabezado→columna, valor→dominio, etc.
export function resolveToCanonical(
  raw: string,
  canonical: readonly string[],
  opts?: { aliases?: Record<string, string>; derive?: (v: string) => string | null },
): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  const hit = canonical.find(c => c.toLowerCase() === v.toLowerCase())
  if (hit) return hit
  return opts?.aliases?.[v.toLowerCase()] ?? opts?.derive?.(v) ?? null
}
