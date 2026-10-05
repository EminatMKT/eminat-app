export { default as list } from './list'
export { default as create } from './create'
export { default as setResponsables } from './staffing'
export { default as updateEstado } from './update-estado'
export { default as updateFecha } from './update-delivery-date'
export { default as update } from './optimistic-update'
export { default as remove } from './remove'

// The data layer of the `actividades` table, reached as `actividadesRepo` through the data barrel.
// Every read goes through the same column list and flattens the responsables embed; every edit is
// checked against the `updated_at` the screen read, and RLS stays the gate because all of it runs
// on the session client.
