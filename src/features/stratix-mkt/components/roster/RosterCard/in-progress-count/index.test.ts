import { describe, expect, it } from 'vitest'
import { ESTADO } from '@/shared/constants/domain'
import type { WorkItem } from '../types'
import inProgressCount from './index'

const MEMBER_ID = 'roster-member-3'
const OTHER_ID = 'roster-member-4'

const ownedBy = (usuarioId: string, estado: string): WorkItem => ({
  estado,
  responsables: [{ usuario_id: usuarioId, es_lider: true }],
})

const work: WorkItem[] = [
  ownedBy(MEMBER_ID, ESTADO.EN_PROCESO),
  ownedBy(MEMBER_ID, ESTADO.PENDIENTE),
  ownedBy(OTHER_ID, ESTADO.EN_PROCESO),
  ownedBy(MEMBER_ID, ESTADO.EN_PROCESO),
]

describe('inProgressCount', () => {
  it('counts only the in-progress work the member is responsible for', () => {
    expect(inProgressCount(work, MEMBER_ID)).toBe(2)
  })

  it('counts each member separately and is zero without work', () => {
    expect(inProgressCount(work, OTHER_ID)).toBe(1)
    expect(inProgressCount([], MEMBER_ID)).toBe(0)
  })
})
