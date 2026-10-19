import { ownerLabel, teamLabel, type SalesDirectory } from './salesDirectory'

const labels: Record<string, string> = {
  status: 'Status', stageCode: 'Stage', source: 'Source', reason: 'Reason',
  displayName: 'Name', name: 'Name', nextFollowUpAt: 'Next follow-up',
  amount: 'Amount', ownerProfileId: 'Owner', teamId: 'Team',
}
const internalId = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

export function historyChanges(changes: unknown, directory: SalesDirectory): string[] {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return []
  return Object.entries(changes).flatMap(([key, raw]) => {
    const label = labels[key]
    if (!label || (typeof raw !== 'string' && typeof raw !== 'number' && typeof raw !== 'boolean')) return []
    const value = key === 'ownerProfileId' ? ownerLabel(directory, String(raw)) :
      key === 'teamId' ? teamLabel(directory, String(raw)) : String(raw)
    if (internalId.test(value)) return []
    return [`${label}: ${value}`]
  })
}
