import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import validateResponsibles from './validate'
import type { ResponsiblesRequest } from './types'

const ana = '22222222-2222-4222-8222-222222222222'
const beto = '33333333-3333-4333-8333-333333333333'
const fields = {
  responsable_id: z.string().optional(),
  responsable_ids: z.array(z.string()).optional(),
  lider_id: z.string().nullable().optional(),
}
const createShape = z.object(fields).superRefine(validateResponsibles.create)
const updateShape = z.object(fields).superRefine(validateResponsibles.update)
const passes = (schema: z.ZodType, request: ResponsiblesRequest) => schema.safeParse(request).success

describe('validateResponsibles', () => {
  it('update rejects both shapes at once and a leader outside the set', () => {
    expect(passes(updateShape, { responsable_id: ana, responsable_ids: [beto] })).toBe(false)
    expect(passes(updateShape, { responsable_ids: [ana], lider_id: beto })).toBe(false)
    expect(passes(updateShape, { lider_id: ana })).toBe(false)
    expect(passes(updateShape, { responsable_ids: [] })).toBe(false)
  })

  it('create also needs at least one responsible', () => {
    expect(passes(createShape, {})).toBe(false)
    expect(passes(createShape, { responsable_ids: [] })).toBe(false)
    expect(passes(createShape, { responsable_id: ana, lider_id: ana })).toBe(true)
  })
})
