import { describe, expect, it } from 'vitest'
import responsablesForm from './responsables'
import type { ActividadResponsable } from '@/features/tasks/types'

const { toggleLeader, toggleResponsable } = responsablesForm
const rows = (items: ActividadResponsable[]) => items

describe('responsables form toggles', () => {
  it('checking a user adds them with no leader by default', () => {
    expect(toggleResponsable([], 'u1', true)).toEqual([{ usuario_id: 'u1', es_lider: false }])
  })

  it('crown click sets that user as sole leader', () => {
    expect(toggleLeader(rows([
      { usuario_id: 'u1', es_lider: false },
      { usuario_id: 'u2', es_lider: true },
    ]), 'u1')).toEqual([
      { usuario_id: 'u1', es_lider: true },
      { usuario_id: 'u2', es_lider: false },
    ])
  })

  it('crown click on active leader unsets leadership', () => {
    expect(toggleLeader(rows([{ usuario_id: 'u1', es_lider: true }]), 'u1')).toEqual([
      { usuario_id: 'u1', es_lider: false },
    ])
  })

  it('unchecking the leader clears leadership', () => {
    expect(toggleResponsable(rows([
      { usuario_id: 'u1', es_lider: true },
      { usuario_id: 'u2', es_lider: false },
    ]), 'u1', false)).toEqual([{ usuario_id: 'u2', es_lider: false }])
  })

  it('unchecked rows cannot be leaders', () => {
    expect(toggleLeader([], 'u1')).toEqual([])
  })
})
