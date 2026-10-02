/** Table, column and RPC names, for code that must not load the data layer's browser client. */
export { TABLES, COLUMNS } from '../data/tables'
export { default as TABLE_COLUMNS } from '../data/columns'
export { default as RPCS } from '../data/rpcs'

// The `@/shared/data` barrel also re-exports the repositories, which create a browser Supabase
// client on import; API routes read schema names from here instead.
