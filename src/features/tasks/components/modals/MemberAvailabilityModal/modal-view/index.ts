'use client'
import { createElement } from 'react'
import type { ComponentProps } from 'react'
import useEditorView from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-view'
import useCloseGuard from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/controller/close-guard'
import EditorActions from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/EditorActions'
import type { EditorProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'

function footerOf(actionsProps: ComponentProps<typeof EditorActions> | null) {
  const footer = actionsProps == null ? undefined : createElement(EditorActions, actionsProps)

  return footer
}

/** Owns the editor controller for the modal: derives the grid/banner bags, the Modal footer and
 *  the close guard, all from ONE controller so the guard sees the same dirty state the grid edits. */
export default function useModalView(editorProps: EditorProps, onClose: () => void) {
  const { controller, gridProps, bannerProps, actionsProps } = useEditorView(editorProps)
  const closeGuard = useCloseGuard(controller, onClose)
  const display = { gridProps, bannerProps, footer: footerOf(actionsProps) }
  const view = { display, closeGuard }

  return view
}

// Footer is undefined (not null) when read-only so Modal skips its fixed footer slot entirely.
