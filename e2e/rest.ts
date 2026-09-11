import { expect, type APIRequestContext } from '@playwright/test'
import { URL, ANON } from './constants'

// Identidad y llamada a PostgREST como un usuario ya autenticado: pide el JWT real a GoTrue y
// arma los headers para llamar con él. `seed.ts` sigue siendo el módulo de datos (crear/borrar
// usuarios con service_role); esto es identidad, y el próximo spec de policy lo va a reusar.
async function token(request: APIRequestContext, email: string, password: string): Promise<string> {
  const r = await request.post(`${URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  expect(r.ok(), `login de ${email}`).toBe(true)
  return (await r.json()).access_token
}

const como = (jwt: string) => ({ apikey: ANON, Authorization: `Bearer ${jwt}` })

// Llamar una RPC como un usuario ya autenticado. Es la forma de probar una función
// SECURITY DEFINER como `tema_para_acta()`: la única escritura que un no-admin puede hacer
// cuando la tabla se cerró a INSERT directo.
const rpc = (request: APIRequestContext, jwt: string, fn: string, args: Record<string, unknown>) =>
  request.post(`${URL}/rest/v1/rpc/${fn}`, {
    headers: { ...como(jwt), 'Content-Type': 'application/json' },
    data: args,
  })

export default { token, como, rpc }
