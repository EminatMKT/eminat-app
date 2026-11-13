import type { I18nKey, useT } from '@/shared/i18n'
import type { EditorStatus } from '../types'

/** EditorActions' inputs: the operation status, its message and the two handlers. */
export type EditorActionsProps = {
  status: EditorStatus
  message: I18nKey | null
  onCancel: () => void
  onSave: () => void
}

/** The translator EditorActions hands to its render helpers. */
export type Translate = ReturnType<typeof useT>['t']

// Split from index.tsx so the component file holds code, not shapes.
