import type { I18nKey } from '@/shared/i18n'

// La forma que ya tenían ESTADO y VERIFICADO en `src/shared/constants/domain.ts` y STAGE en
// Research: un objeto META valor → { labelKey, color } del que se derivan la lista, el mapa de
// colores y la función que traduce. Estaba escrita tres veces; Reuniones necesitaba cinco más,
// así que la forma sale a un solo lugar en vez de copiarse ocho.
//
// Lo que compra: el valor canónico NUNCA se renderiza. `label()` pasa por i18n y cae al valor
// crudo sólo si llega uno fuera del catálogo — que es un bug de quien lo emite, no algo que el
// usuario pueda arreglar, pero al menos se ve.
export type MetaValor = { labelKey: I18nKey; color?: string }

export function catalogoMeta<V extends string>(meta: Record<V, MetaValor>) {
  const entradas = Object.entries(meta) as [V, MetaValor][]
  const valores = entradas.map(([v]) => v)
  const colores = Object.fromEntries(entradas.map(([v, m]) => [v, m.color ?? ''])) as Record<string, string>

  const label = (v: string | undefined, t: (k: I18nKey) => string): string => {
    const m = (meta as Record<string, MetaValor>)[v ?? '']
    return m ? t(m.labelKey) : (v || '—')
  }

  const resultado = { valores, colores, label }
  return resultado
}
