'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MeetingRecord, MeetingUpdateInput } from '@/features/meet/lib/types'
import { toMeetingUpdateInput } from '@/features/meet/lib/validation/meeting'
import { decideSnapshotTransition } from '@/features/meet/lib/local/editor-snapshot'

function editableMeeting(meeting: MeetingRecord): MeetingUpdateInput {
  return {
    title: meeting.title,
    objective: meeting.objective,
    modality: meeting.modality,
    location: meeting.location,
    meeting_date: meeting.meeting_date,
    start_time: meeting.start_time,
    end_time: meeting.end_time,
    meeting_type: meeting.meeting_type,
  }
}

export function useMeetingEditor(meeting: MeetingRecord | null) {
  const incomingPayload = useMemo(
    () => (meeting ? editableMeeting(meeting) : null),
    [meeting]
  )
  const incomingSnapshot = JSON.stringify(incomingPayload)
  const sourceKey = meeting ? `${meeting.id}:${meeting.updated_at}` : null
  const [draft, setDraft] = useState<MeetingUpdateInput | null>(incomingPayload)
  const [baselineSnapshot, setBaselineSnapshot] = useState(incomingSnapshot)
  const [loadedSourceKey, setLoadedSourceKey] = useState(sourceKey)
  const [loadedMeetingId, setLoadedMeetingId] = useState(meeting?.id ?? null)
  const [conflict, setConflict] = useState(false)
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => {
    const hasLocalChanges = JSON.stringify(draftRef.current) !== baselineSnapshot
    const decision = decideSnapshotTransition({
      sameEntity: loadedMeetingId === (meeting?.id ?? null),
      incomingChanged:
        sourceKey !== loadedSourceKey || incomingSnapshot !== baselineSnapshot,
      localDirty: hasLocalChanges,
    })
    if (decision === 'keep') return
    if (decision === 'conflict') {
      setConflict(true)
      return
    }
    setDraft(incomingPayload)
    setBaselineSnapshot(incomingSnapshot)
    setLoadedSourceKey(sourceKey)
    setLoadedMeetingId(meeting?.id ?? null)
    setConflict(false)
  }, [
    baselineSnapshot,
    incomingPayload,
    incomingSnapshot,
    loadedSourceKey,
    loadedMeetingId,
    meeting?.id,
    sourceKey,
  ])

  const validation = useMemo(
    () => toMeetingUpdateInput((draft ?? {}) as Record<string, unknown>),
    [draft]
  )

  function patchDraft(patch: Partial<MeetingUpdateInput>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function detectConcurrentConflict(remote: MeetingRecord): boolean {
    const changed = Boolean(
      meeting &&
        remote.id === meeting.id &&
        remote.updated_at !== meeting.updated_at &&
        JSON.stringify(draftRef.current) !== baselineSnapshot
    )
    if (changed) setConflict(true)
    return changed
  }

  function acceptSaved(saved: MeetingRecord) {
    const payload = editableMeeting(saved)
    const snapshot = JSON.stringify(payload)
    setDraft(payload)
    setBaselineSnapshot(snapshot)
    setLoadedSourceKey(`${saved.id}:${saved.updated_at}`)
    setLoadedMeetingId(saved.id)
    setConflict(false)
  }

  return {
    draft,
    patchDraft,
    validation,
    validatedPayload: validation.ok ? validation.value : null,
    dirty: JSON.stringify(draft) !== baselineSnapshot,
    conflict,
    detectConcurrentConflict,
    clearConcurrentConflict: () => setConflict(false),
    acceptSaved,
  }
}
