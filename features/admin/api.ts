// POST JSON a un endpoint admin. Devuelve la respuesta cruda + el body parseado,
// para que el caller decida según res.ok / result.ok como venía haciendo.
export async function apiPost(url: string, body: unknown): Promise<{ res: Response; result: any }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await res.json()
  return { res, result }
}
