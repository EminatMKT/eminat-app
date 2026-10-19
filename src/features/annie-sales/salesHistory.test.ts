import { describe, expect, it } from 'vitest'
import { historyChanges } from './salesHistory'

describe('ANNIE history display', () => {
  it('renders staff and team names while suppressing technical record IDs', () => {
    const owner = '11111111-1111-4111-8111-111111111111'
    const team = '22222222-2222-4222-8222-222222222222'
    const other = '33333333-3333-4333-8333-333333333333'
    expect(historyChanges({ ownerProfileId: owner, teamId: team, status: 'QUALIFIED',
      accountId: other, reason: other, operationId: other }, {
      users: [{ principalId: owner, role: 'OPERATOR', displayName: 'Ana Seller' }],
      teamNames: { [team]: 'Care team' },
    })).toEqual(['Owner: Ana Seller', 'Team: Care team', 'Status: QUALIFIED'])
  })
})
