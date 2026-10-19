import { describe, expect, it } from 'vitest'
import reviewFixture from '../reviewFixture'
import buildReviewMergeValues from '.'

// The winner has no main phone; the loser's main phone is 555-0002, also one of its contact rows.
const WINNER_FIELDS = { telefono: null, email: null }
const WINNER_CONTACTS = { telefono: [{ id: 'w1', valor: '555-0001' }, { id: 'w2', valor: '555-0009' }] }
const LOSER_FIELDS = { telefono: '555-0002', email: 'b@example.invalid' }
const LOSER_CONTACTS = {
  telefono: [{ id: 'l1', valor: '555-0001' }, { id: 'l2', valor: '555-0002' }],
  email: [{ id: 'l3', valor: 'b@example.invalid' }],
}
const NO_CHOICES: Record<string, string> = {}
const winner = reviewFixture(WINNER_FIELDS, WINNER_CONTACTS)
const loser = reviewFixture(LOSER_FIELDS, LOSER_CONTACTS)
const mergeExcluding = (excludedIds: string[]) => buildReviewMergeValues(winner, loser, NO_CHOICES, excludedIds)

// The bug this guards against (review C1): the merge filled the winner's blank main phone with
// the very loser value the reviewer had just unchecked.
describe('buildReviewMergeValues', () => {
  it('keeps the winner’s blank phone when the loser’s phone was unchecked', () => {
    expect(mergeExcluding(['l2']).telefono).toBeNull()
  })

  it('still adopts the loser’s phone when it was kept', () => {
    expect(mergeExcluding([]).telefono).toBe('555-0002')
  })

  it('treats email the same way', () => {
    expect(mergeExcluding(['l3']).email).toBeNull()
    expect(mergeExcluding([]).email).toBe('b@example.invalid')
  })

  it('leaves the phone alone when the unchecked value is a different one', () => {
    expect(mergeExcluding(['l1']).telefono).toBe('555-0002')
  })
})
