// Barrel de la capa de acceso a datos. Centraliza todas las operaciones de
// datos contra Supabase (supabase.from(...)) para que una futura migración de
// DB toque un solo lugar.
export { removeChannel } from './realtime' // helper de Realtime, único para toda la capa de datos
export * as usuariosRepo from './usuarios'
export * as actividadesRepo from './actividades'
export * as notificacionesRepo from './notificaciones'
export * as researchRepo from './research'
export * as billingV1Repo from './billing_v1'
// Billing v2 is a single default export and not a namespace: its folder already decides what the
// repository offers, so the barrel only gives it the name the rest of the app calls it by.
export { default as billingV2Repo } from './billing_v2'
/** One stored billing v2 row, offered beside its repository: the editor is its first consumer
 *  and imports it from here rather than by the folder path. */
export type { BillingV2Record } from './billing_v2/types'
export * as rolesRepo from './roles'
export * as orgRepo from './org'
export * as reunionesRepo from './reuniones'
// El tipo se re-exporta acá y no se importa por su ruta desde afuera: la regla del barrel vale
// también para los tipos.
export * as vistasFiltroRepo from './vistas-filtro'
export type { VistaFiltro } from './vistas-filtro'
