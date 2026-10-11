'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ParticipantLinkInput, ParticipantRecord } from '@/features/meet/lib/types'
import { decideSnapshotTransition } from '@/features/meet/lib/local/editor-snapshot'

const emptyParticipants: ParticipantRecord[] = []
const signature = (participants: ParticipantRecord[]) =>
  JSON.stringify(
    participants
      .map(({ meeting_id, profile_id }) => `${meeting_id}:${profile_id}`)
      .sort()
  )

export function useParticipantsEditor(
  initial: ParticipantRecord[] = emptyParticipants
) {
  const incomingSignature = signature(initial)
  const [participants, setParticipants] = useState(initial)
  const [baselineSignature, setBaselineSignature] = useState(incomingSignature)
  const [conflict, setConflict] = useState(false)
  const participantsRef = useRef(participants)
  participantsRef.current = participants

  useEffect(() => {
    const decision = decideSnapshotTransition({
      sameEntity: true,
      incomingChanged: incomingSignature !== baselineSignature,
      localDirty: signature(participantsRef.current) !== baselineSignature,
    })
    if (decision === 'keep') return
    if (decision === 'conflict') {
      setConflict(true)
      return
    }
    setParticipants(initial)
    setBaselineSignature(incomingSignature)
    setConflict(false)
  }, [baselineSignature, incomingSignature, initial])

  const duplicateProfileIds = useMemo(() => {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const participant of participants) {
      if (seen.has(participant.profile_id)) duplicates.add(participant.profile_id)
      seen.add(participant.profile_id)
    }
    return Array.from(duplicates)
  }, [participants])

  const validatedPayload: ParticipantLinkInput[] | null =
    duplicateProfileIds.length === 0
      ? participants.map(({ meeting_id, profile_id }) => ({
          meeting_id,
          profile_id,
        }))
      : null

  function addLocal(participant: ParticipantRecord) {
    setParticipants((current) =>
      current.some((item) => item.profile_id === participant.profile_id)
        ? current
        : [...current, participant]
    )
  }

  function removeLocal(profileId: string) {
    setParticipants((current) =>
      current.filter((item) => item.profile_id !== profileId)
    )
  }

  return {
    participants,
    addLocal,
    removeLocal,
    validatedPayload,
    duplicateProfileIds,
    dirty: signature(participants) !== baselineSignature,
    conflict,
    clearConcurrentConflict: () => setConflict(false),
    persistenceBlocked: true as const,
    blockedReason: 'RLS y unicidad de meeting_participants: NOT VERIFIED',
  }
}
