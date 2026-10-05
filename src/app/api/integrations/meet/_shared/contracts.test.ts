import { describe, expect, it } from 'vitest'
import { createMeetTaskSchema, updateMeetTaskSchema } from './contracts'

const ana = '22222222-2222-4222-8222-222222222222'
const beto = '33333333-3333-4333-8333-333333333333'
const valid = {
  topic_id: '11111111-1111-4111-8111-111111111111',
  titulo: 'Task',
  descripcion: null,
  responsable_id: ana,
  fecha_inicio: '2026-09-18',
  fecha_entrega: '2026-09-30',
  empresa: 'STRATIX',
}
const { responsable_id: _legacy, ...withoutResponsible } = valid
const stamp = { expected_updated_at: '2026-09-18T12:00:00Z' }

describe('contrato Meet Tasks', () => {
  it('acepta el alta canónica', () => expect(createMeetTaskSchema.safeParse(valid).success).toBe(true))
  it('no permite que Meet elija el estado al crear', () => expect(createMeetTaskSchema.safeParse({ ...valid, estado: 'Pendiente' }).success).toBe(false))
  it('rechaza campos de autoridad o destinatarios enviados por el cliente', () => {
    expect(createMeetTaskSchema.safeParse({ ...valid, created_by_id: valid.responsable_id }).success).toBe(false)
    expect(createMeetTaskSchema.safeParse({ ...valid, emails: ['x@example.com'] }).success).toBe(false)
  })
  it('exige expected_updated_at y al menos un cambio en PATCH', () => {
    expect(updateMeetTaskSchema.safeParse({ expected_updated_at: '2026-09-18T12:00:00Z' }).success).toBe(false)
    expect(updateMeetTaskSchema.safeParse({ expected_updated_at: '2026-09-18T12:00:00Z', titulo: 'Nueva Task' }).success).toBe(true)
  })
  it('rechaza estado en PATCH y acepta empresa canónica', () => {
    expect(updateMeetTaskSchema.safeParse({ expected_updated_at: '2026-09-18T12:00:00Z', estado: 'En proceso' }).success).toBe(false)
    expect(updateMeetTaskSchema.safeParse({ expected_updated_at: '2026-09-18T12:00:00Z', empresa: 'STRATIX' }).success).toBe(true)
  })
})

describe('Meet contract: multiple responsibles', () => {
  it('create accepts the new responsable_ids array with an optional leader', () => {
    expect(createMeetTaskSchema.safeParse({ ...withoutResponsible, responsable_ids: [ana, beto] }).success).toBe(true)
    expect(createMeetTaskSchema.safeParse({ ...withoutResponsible, responsable_ids: [ana, beto], lider_id: beto }).success).toBe(true)
  })
  it('create needs exactly one of the two shapes', () => {
    expect(createMeetTaskSchema.safeParse(withoutResponsible).success).toBe(false)
    expect(createMeetTaskSchema.safeParse({ ...valid, responsable_ids: [ana] }).success).toBe(false)
  })
  it('rejects a leader outside the responsibles', () => {
    expect(createMeetTaskSchema.safeParse({ ...withoutResponsible, responsable_ids: [ana], lider_id: beto }).success).toBe(false)
    expect(createMeetTaskSchema.safeParse({ ...valid, lider_id: beto }).success).toBe(false)
  })
  it('update accepts either the legacy single id or the array', () => {
    expect(updateMeetTaskSchema.safeParse({ ...stamp, responsable_id: ana }).success).toBe(true)
    expect(updateMeetTaskSchema.safeParse({ ...stamp, responsable_ids: [ana, beto], lider_id: ana }).success).toBe(true)
    expect(updateMeetTaskSchema.safeParse({ ...stamp, responsable_ids: [] }).success).toBe(true)
  })
  it('update rejects a leader without the responsibles it belongs to', () => {
    expect(updateMeetTaskSchema.safeParse({ ...stamp, lider_id: ana }).success).toBe(false)
    expect(updateMeetTaskSchema.safeParse({ ...stamp, responsable_id: ana, responsable_ids: [beto] }).success).toBe(false)
  })
})
