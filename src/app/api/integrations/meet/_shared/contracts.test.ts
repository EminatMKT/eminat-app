import { describe, expect, it } from 'vitest'
import { createMeetTaskSchema, updateMeetTaskSchema } from './contracts'

const valid = {
  topic_id: '11111111-1111-4111-8111-111111111111', titulo: 'Task', descripcion: null,
  responsable_id: '22222222-2222-4222-8222-222222222222',
  fecha_inicio: '2026-09-18', fecha_entrega: '2026-09-30', empresa: 'STRATIX',
}

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
