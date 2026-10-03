import { describe, expect, it } from 'vitest'
import ACTIVITY_SELECT from '.'

describe('ACTIVITY_SELECT', () => {
  it('embeds the responsables through the explicit foreign key', () => {
    const embed = 'actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id, es_lider)'

    expect(ACTIVITY_SELECT).toContain(embed)
  })

  it('names its columns and no longer asks for the dropped responsable_id', () => {
    expect(ACTIVITY_SELECT).not.toContain('*')
    expect(ACTIVITY_SELECT).not.toMatch(/\bresponsable_id\b/)
    expect(ACTIVITY_SELECT).toMatch(/\bupdated_at\b/)
  })
})
