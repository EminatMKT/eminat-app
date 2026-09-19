import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  'supabase/migrations/20260918120000_create_meet_activity_for_topic.sql',
  'utf8',
)

describe('create_meet_activity_for_topic migration', () => {
  it('deriva el actor exclusivamente desde auth.uid y usuarios.auth_id', () => {
    expect(sql).toContain('WHERE auth_id = auth.uid()')
    expect(sql).toContain('AND activo = true')
    expect(sql).toContain("RAISE EXCEPTION 'active_actor_not_found'")
    expect(sql).toContain('p_descripcion, p_responsable_id, actor_id, actor_id')
  })

  it('no permite que el cliente suministre o falsifique actor_id', () => {
    expect(sql).not.toContain('p_actor_id')
    expect(sql).not.toMatch(/p_created_by|p_solicitante/)
  })

  it('no acepta estado desde Meet y crea con el estado inicial del CRM', () => {
    expect(sql).not.toContain('p_estado')
    expect(sql).toContain("p_empresa, 'Pendiente', p_fecha_inicio")
  })

  it('rechaza un usuario inexistente o inactivo', () => {
    expect(sql).toMatch(/auth_id = auth\.uid\(\)[\s\S]*activo = true/)
    expect(sql).toContain("IF NOT FOUND THEN RAISE EXCEPTION 'active_actor_not_found'")
  })

  it('valida que el Topic pertenece a una reunión del JWT', () => {
    expect(sql).toContain('JOIN public.meetings m ON m.id = t.meeting_id')
    expect(sql).toContain('meeting_owner_id IS DISTINCT FROM auth.uid()')
    expect(sql).toContain("RAISE EXCEPTION 'topic_forbidden'")
  })

  it('rechaza un Topic inexistente', () => {
    expect(sql).toContain("IF NOT FOUND THEN RAISE EXCEPTION 'topic_not_found'")
  })

  it('serializa y hace idempotente un reintento', () => {
    expect(sql).toContain('FOR UPDATE OF t')
    expect(sql).toContain('IF linked_id IS NOT NULL THEN RETURN linked_id')
    expect(sql).toContain('UPDATE public.topics SET actividad_id = linked_id')
  })

  it('mantiene SECURITY INVOKER y no altera RLS', () => {
    expect(sql).toContain('SECURITY INVOKER')
    expect(sql).not.toContain('SECURITY DEFINER')
    expect(sql).not.toMatch(/ALTER TABLE[\s\S]*ROW LEVEL SECURITY/i)
  })
})
