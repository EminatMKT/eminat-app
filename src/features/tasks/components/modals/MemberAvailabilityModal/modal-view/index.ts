'use client'
import { createElement } from 'react'
import type { ComponentProps } from 'react'
import useEditorView from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-view'
import useCloseGuard from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/controller/close-guard'
import EditorActions from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/EditorActions'
import type { EditorProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'

function footerOf(actionsProps: ComponentProps<typeof EditorActions> | null, onCancel: () => void) {
  if (actionsProps == null) {
    return undefined
  }

  const guardedProps = { ...actionsProps, onCancel }
  const footer = createElement(EditorActions, guardedProps)

  return footer
}

/** Owns the editor controller for the modal: derives the grid/banner bags, the Modal footer and
 *  the close guard, all from ONE controller so the guard sees the same dirty state the grid edits.
 *  The footer's Cancel goes through the guard too, so it never drops unsaved edits silently. */
export default function useModalView(editorProps: EditorProps, onClose: () => void) {
  const { controller, gridProps, bannerProps, actionsProps } = useEditorView(editorProps)
  const closeGuard = useCloseGuard(controller, onClose)
  const footer = footerOf(actionsProps, closeGuard.requestClose)
  const display = { gridProps, bannerProps, footer }
  const view = { display, closeGuard }

  return view
}

// Footer is undefined (not null) when read-only so Modal skips its fixed footer slot entirely.
