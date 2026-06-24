// Barrel de la capa de acceso a datos. Centraliza todas las operaciones de
// datos contra Supabase (supabase.from(...)) para que una futura migración de
// DB toque un solo lugar.
export * as usuariosRepo from './usuarios'
export * as actividadesRepo from './actividades'
export * as notificacionesRepo from './notificaciones'
export * as researchRepo from './research'
export * as cobranzasRepo from './cobranzas'
export * as rolesRepo from './roles'
