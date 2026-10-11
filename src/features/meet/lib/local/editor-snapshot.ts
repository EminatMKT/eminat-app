export type SnapshotDecision = 'keep' | 'replace' | 'conflict'

export function decideSnapshotTransition({
  sameEntity,
  incomingChanged,
  localDirty,
}: {
  sameEntity: boolean
  incomingChanged: boolean
  localDirty: boolean
}): SnapshotDecision {
  if (!sameEntity) return 'replace'
  if (!incomingChanged) return 'keep'
  return localDirty ? 'conflict' : 'replace'
}
