// Barrel de la capa de acceso a datos. Centraliza todas las operaciones de
// datos contra Supabase (supabase.from(...)) para que una futura migración de
// DB toque un solo lugar.
export { removeChannel } from './realtime' // helper de Realtime, único para toda la capa de datos
export * as usuariosRepo from './usuarios'
export * as actividadesRepo from './actividades'
export * as notificacionesRepo from './notificaciones'
export * as researchRepo from './research'
export * as cobranzasRepo from './cobranzas'
export * as rolesRepo from './roles'
export * as orgRepo from './org'
export * as reunionesRepo from './reuniones'
// El tipo se re-exporta acá y no se importa por su ruta desde afuera: la regla del barrel vale
// también para los tipos.
export * as vistasFiltroRepo from './vistas-filtro'
export type { VistaFiltro } from './vistas-filtro'
export { default as temasRepo } from './temas'
