import { describe, expect, it } from 'vitest'
import { ownerLabel, roleLabel, teamLabel } from './salesDirectory'

describe('Sales directory labels', () => {
  const directory = {
    users: [{ principalId: 'internal-user-id', role: 'OPERATOR', displayName: 'Ana Rivera' }],
    teams: ['internal-team-id'], teamNames: { 'internal-team-id': 'Sales East' },
  }

  it('uses ANNIE names and preserves IDs only as option values', () => {
    expect(ownerLabel(directory, 'internal-user-id')).toBe('Ana Rivera')
    expect(teamLabel(directory, 'internal-team-id')).toBe('Sales East')
    expect(roleLabel('OPERATOR')).toBe('Seller')
  })

  it('never falls back to showing an unknown internal identifier', () => {
    expect(ownerLabel(directory, 'unknown-user-id')).toBe('Team member')
    expect(teamLabel(directory, 'unknown-team-id')).toBe('Team')
  })
})
