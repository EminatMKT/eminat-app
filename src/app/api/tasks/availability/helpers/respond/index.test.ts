import { describe, expect, it } from 'vitest'
import respond from '.'

const MESSAGE = 'No disponible.'
const STATUS = 403
const DEFAULT_STATUS = 200

describe('respond', () => {
  it('replies with the message under `error`, at the given status', async () => {
    const expectedBody = { error: MESSAGE }
    const response = respond(MESSAGE, STATUS)

    expect(response.status).toBe(STATUS)
    expect(await response.json()).toEqual(expectedBody)
  })

  it('passes an undefined message or status through unchanged', async () => {
    const expectedBody = { error: undefined }
    const response = respond(undefined, undefined)

    expect(response.status).toBe(DEFAULT_STATUS)
    expect(await response.json()).toEqual(expectedBody)
  })
})
