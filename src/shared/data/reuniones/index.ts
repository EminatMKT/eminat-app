// Barrel: sólo re-exporta. `participantes` va con namespace porque tiene su propio
// `insert`/`update` y sin él colisionaría con los de `reuniones`.
export { list, byId, insert, updateForm } from './reuniones'
export * as participantes from './participantes'
