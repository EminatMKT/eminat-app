import { describe, expect, it } from 'vitest'
import MEET_PROJECTIONS from '.'

const WILDCARD = '*'
const LEGACY_SINGLE_RESPONSIBLE = 'responsable_id'

describe('MEET_PROJECTIONS', () => {
  it.each(Object.entries(MEET_PROJECTIONS))('%s names its columns explicitly', (_key, projection) => {
    expect(projection.length).toBeGreaterThan(0)
    expect(projection).not.toContain(WILDCARD)
  })

  it('the task projection reads responsibles from the join table, not the dropped column', () => {
    expect(MEET_PROJECTIONS.task).toContain('actividad_responsables!actividad_responsables_actividad_id_fkey')
    expect(MEET_PROJECTIONS.task).not.toContain(LEGACY_SINGLE_RESPONSIBLE)
  })
})
