import { describe, expect, it } from 'vitest'
import { readJsonObject } from './read-json-object'
function stream(chunks: string[], headers = {}) {
  return new Request('https://local.invalid', { method: 'POST', headers,
    body: new ReadableStream({ start(controller) { for (const part of chunks) controller.enqueue(new TextEncoder().encode(part)); controller.close() } }),
    duplex: 'half',
  } as RequestInit)
}
describe('bounded patient JSON', () => {
  it('accepts valid split JSON without Content-Length', async () => {
    expect(await readJsonObject(stream(['{"name":', '"Ana"}']), 20)).toEqual({ name: 'Ana' })
  })
  it('rejects oversized chunked bodies and dishonest Content-Length', async () => {
    for (const headers of [{}, { 'Content-Length': '1' }])
      expect(await readJsonObject(stream(['{"a":"', 'x'.repeat(40), '"}'], headers), 20)).toBeNull()
  })
  it('counts UTF-8 bytes rather than characters', async () => {
    expect(await readJsonObject(stream(['{"a":"ééé"}']), 12)).toBeNull()
  })
  it.each(['null', '[]', '{broken', '"value"'])('rejects malformed/non-object JSON %s', async body => {
    expect(await readJsonObject(stream([body]), 100)).toBeNull()
  })
})
