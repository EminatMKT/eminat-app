// Barrel de la capa de base de datos. Sólo re-exporta.
//
// ⚠️ EXPORTA SÓLO LO QUE PUEDE CORRER EN EL NAVEGADOR, y eso no es una omisión: es la razón de
// que este barrel no existiera. `supabaseAdmin`, `requireAdmin`, `requireAccess`, `serverEnv` y
// `usuarioCargos` son de servidor —los dos primeros usan `next/headers`, los otros leen
// `SUPABASE_SECRET_KEY`— y meterlos acá los ataría al grafo de módulos de cualquier componente
// que importe `@/shared/db`. La `service_role` saltea toda la RLS: no puede quedar a un tree
// shaking de distancia del bundle (ver rules/seguridad.md y rules/codigo.md).
//
// Esos cinco se siguen importando por su ruta, desde una ruta API y con su guard. Un barrel no
// tiene que exportar todo el directorio: tiene que exportar lo público, y lo de servidor no lo
// es para el cliente.
export { supabase } from './supabase'
export { clientEnv, isProdDb, isDevDb } from './env.client'
export { clearAuthCookies } from './clearAuthCookies'
