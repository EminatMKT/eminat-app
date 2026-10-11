'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { TopicEditorialUpdate, TopicRecord } from '@/features/meet/lib/types'
import { toTopicEditorialUpdate } from '@/features/meet/lib/validation/topic'
import { decideSnapshotTransition } from '@/features/meet/lib/local/editor-snapshot'

function editableTopic(topic: TopicRecord): TopicEditorialUpdate {
  return {
    title: topic.title,
    description: topic.description,
    section: topic.section,
    order_index: topic.order_index,
  }
}

export function useTopicsEditor(topic: TopicRecord | null) {
  const incomingPayload = useMemo(
    () => (topic ? editableTopic(topic) : null),
    [topic]
  )
  const incomingSnapshot = JSON.stringify(incomingPayload)
  const sourceId = topic?.id ?? null
  const [draft, setDraft] = useState<TopicEditorialUpdate | null>(incomingPayload)
  const [baselineSnapshot, setBaselineSnapshot] = useState(incomingSnapshot)
  const [loadedSourceId, setLoadedSourceId] = useState(sourceId)
  const [conflict, setConflict] = useState(false)
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => {
    const hasLocalChanges = JSON.stringify(draftRef.current) !== baselineSnapshot
    const decision = decideSnapshotTransition({
      sameEntity: loadedSourceId === sourceId,
      incomingChanged: incomingSnapshot !== baselineSnapshot,
      localDirty: hasLocalChanges,
    })
    if (decision === 'keep') return
    if (decision === 'conflict') {
      setConflict(true)
      return
    }
    setDraft(incomingPayload)
    setBaselineSnapshot(incomingSnapshot)
    setLoadedSourceId(sourceId)
    setConflict(false)
  }, [
    baselineSnapshot,
    incomingPayload,
    incomingSnapshot,
    loadedSourceId,
    sourceId,
  ])

  const validation = useMemo(
    () => toTopicEditorialUpdate((draft ?? {}) as Record<string, unknown>),
    [draft]
  )

  function patchDraft(patch: Partial<TopicEditorialUpdate>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function detectConcurrentConflict(remote: TopicRecord): boolean {
    const remoteSnapshot = JSON.stringify(editableTopic(remote))
    const changed = Boolean(
      topic &&
        remote.id === topic.id &&
        remoteSnapshot !== baselineSnapshot &&
        JSON.stringify(draftRef.current) !== baselineSnapshot
    )
    if (changed) setConflict(true)
    return changed
  }

  function acceptSaved(saved: TopicRecord) {
    const payload = editableTopic(saved)
    const snapshot = JSON.stringify(payload)
    setDraft(payload)
    setBaselineSnapshot(snapshot)
    setLoadedSourceId(saved.id)
    setConflict(false)
  }

  return {
    draft,
    patchDraft,
    validation,
    validatedPayload: validation.ok ? validation.value : null,
    linkedActivityId: topic?.actividad_id ?? null,
    dirty: JSON.stringify(draft) !== baselineSnapshot,
    conflict,
    detectConcurrentConflict,
    clearConcurrentConflict: () => setConflict(false),
    acceptSaved,
  }
}
