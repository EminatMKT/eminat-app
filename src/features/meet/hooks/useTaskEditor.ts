'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CanonicalTaskRecord } from '@/features/meet/lib/types'
import { toTaskUpdateInput } from '@/features/meet/lib/validation/task'

export function useTaskEditor(task: CanonicalTaskRecord | null | undefined) {
  const snapshot = task ? `${task.id}:${task.updated_at}` : ''
  const [loaded, setLoaded] = useState(snapshot)
  const [dirty, setDirty] = useState(false)
  const [conflictTask, setConflictTask] = useState<CanonicalTaskRecord | null>(null)
  const [draft, setDraft] = useState(() => task ? ({ titulo: task.titulo, descripcion: task.descripcion ?? '', responsable_id: task.responsable_id, fecha_entrega: task.fecha_entrega ?? '', empresa: task.empresa }) : null)

  useEffect(() => {
    if (!task || snapshot === loaded) return
    if (dirty) { setConflictTask(task); return }
    setDraft({ titulo: task.titulo, descripcion: task.descripcion ?? '', responsable_id: task.responsable_id, fecha_entrega: task.fecha_entrega ?? '', empresa: task.empresa })
    setLoaded(snapshot)
    setConflictTask(null)
  }, [dirty, loaded, snapshot, task])

  const validation = useMemo(() => task && draft ? toTaskUpdateInput(draft, task.updated_at) : { ok: false as const, error: 'Task no disponible.' }, [draft, task])
  const patch = (change: Record<string, string>) => { setDirty(true); setDraft((current) => current ? { ...current, ...change } : current) }
  const accept = (saved: CanonicalTaskRecord) => {
    setDraft({ titulo: saved.titulo, descripcion: saved.descripcion ?? '', responsable_id: saved.responsable_id, fecha_entrega: saved.fecha_entrega ?? '', empresa: saved.empresa })
    setLoaded(`${saved.id}:${saved.updated_at}`); setDirty(false); setConflictTask(null)
  }
  const markConflict = (current: CanonicalTaskRecord) => setConflictTask(current)
  const acceptConflict = () => {
    if (conflictTask) accept(conflictTask)
  }

  return {
    draft,
    patch,
    validatedPayload: validation.ok ? validation.value : null,
    error: validation.ok ? null : validation.error,
    dirty,
    conflict: Boolean(conflictTask),
    conflictTask,
    markConflict,
    acceptConflict,
    accept,
  }
}
