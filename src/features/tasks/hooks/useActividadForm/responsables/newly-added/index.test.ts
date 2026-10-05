import { describe, expect, it } from 'vitest'
import newlyAddedResponsableIds from '.'

const r = (usuario_id: string) => ({ usuario_id, es_lider: false })

describe('newlyAddedResponsableIds', () => {
  it('lists only who is new in the set, once each, never the actor', () => {
    const previous = [r('a'), r('b')]
    const next = [r('b'), r('c'), r('c'), r('a2'), r('me')]
    expect(newlyAddedResponsableIds(previous, next, 'me')).toEqual(['c', 'a2'])
  })

  it('without an actor everyone new is listed', () => {
    expect(newlyAddedResponsableIds([], [r('a')], null)).toEqual(['a'])
  })
})
