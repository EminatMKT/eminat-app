// shared/api.ts — helper HTTP genérico (JSON in/out). Caller decide según res.ok.
// Genérico sobre el shape de la respuesta: el caller declara el tipo esperado del
// body (default `unknown`) y lo narrowa vía res.ok / propiedades.
export async function apiSend<T = unknown>(method: string, url: string, body?: unknown): Promise<{ res: Response; result: T }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = (await res.json().catch(() => ({}))) as T   // DELETE puede no traer body
  return { res, result }
}
export const apiPost = <T = unknown>(url: string, body: unknown) => apiSend<T>('POST', url, body)
