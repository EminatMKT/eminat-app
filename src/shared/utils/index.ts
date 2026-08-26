// Barrel de las utilidades compartidas: un solo import por consumidor en vez de uno por función.
//
// Re-exportación NOMBRADA y no `export *`: los nombres de acá no se pisan entre sí, y la forma
// nombrada es la que el bundler sacude sin arrastrar vecinos. El namespace (`export * as xRepo`)
// queda para `src/shared/data`, donde cada repo tiene su propio `list`/`insert`/`update` y sin
// namespace el barrel sería una colisión.
//
// Este archivo NO define nada: solo re-exporta. Y ninguno de los módulos de acá importa de
// `@/shared/utils`, que es lo que evita el ciclo — verificarlo antes de sumar uno nuevo.
// Ver `rules/codigo.md`.

export { localDate, localMonth } from './dates'
export { resolveToCanonical } from './canonical'
export { detectSeparator, parseDelimited } from './delimited'
export { applyFilters, distinctValues, distinctTokens } from './filters'
export type { FilterDef, FilterValues } from './filters'
export { escapeHtml } from './html'
export { apiSend, apiPost } from './api'
export { esDelCatalogo, soloDelCatalogo } from './catalogo'
