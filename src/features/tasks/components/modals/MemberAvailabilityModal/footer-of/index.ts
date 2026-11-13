import { createElement, type ComponentProps } from 'react'
import EditorActions from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/EditorActions'

/** The Modal footer for the editor's actions, with Cancel routed to `onCancel` (the close
 *  guard) instead of the editor's raw handler; undefined when the editor is read-only. */
export default function footerOf(
  actionsProps: ComponentProps<typeof EditorActions> | null,
  onCancel: () => void,
) {
  if (actionsProps == null) {
    return undefined
  }

  const guardedProps = { ...actionsProps, onCancel }
  const footer = createElement(EditorActions, guardedProps)

  return footer
}

// Undefined (not null) when read-only, so Modal skips its fixed footer slot entirely.
