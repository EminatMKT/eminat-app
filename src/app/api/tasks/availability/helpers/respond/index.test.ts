import { describe, expect, it } from 'vitest'
import respond from '.'

describe('respond', () => {
  it('replies with the message under `error`, at the given status', async () => {
    const response = respond('No disponible.', 403)
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({ error: 'No disponible.' })
  })

  it('passes an undefined message or status through unchanged', async () => {
    const response = respond(undefined, undefined)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ error: undefined })
  })
})
