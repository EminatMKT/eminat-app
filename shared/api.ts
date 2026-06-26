// shared/api.ts — helper HTTP genérico (JSON in/out). Caller decide según res.ok.
export async function apiSend(method: string, url: string, body?: unknown): Promise<{ res: Response; result: any }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await res.json().catch(() => ({}))   // DELETE puede no traer body
  return { res, result }
}
export const apiPost = (url: string, body: unknown) => apiSend('POST', url, body)
