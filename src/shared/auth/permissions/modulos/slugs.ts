// Los slugs, y nada más. Vive solo para que `types.ts` y `roles/` puedan importar
// `ModuleSlug` sin arrastrar el catálogo entero ni armar un ciclo con `index.ts`.
//
// El slug se escribe UNA vez, acá. El código pregunta por `MODULE.STRATIX_MKT`, nunca por el
// literal: un slug mal escrito a mano no rompe el build, sólo deja de coincidir y la lista sale
// vacía.

export const MODULE = {
  STRATIX_MKT: 'stratix-mkt',
  COBRANZAS: 'cobranzas',
  RESEARCH: 'research',
  MEDICAL: 'medical',
  ACCOUNTING: 'accounting',
  TH_HR: 'th-hr',
  DIRECTORIO: 'directorio',
  ADMIN: 'admin',
} as const

export type ModuleSlug = (typeof MODULE)[keyof typeof MODULE]
