import type { I18nKey } from '@/shared/i18n'
import type { RecordForm } from '@/features/billing-v2/components/RecordEditor/types'

/** The editor's whole life: the boxes as opened and as they are now, which ones the person
 *  left, how many times Save met an invalid form, and whether a write travels or failed. */
export type EditorState = {
  initial: RecordForm; form: RecordForm; left: (keyof RecordForm)[]
  attempts: number; failure: I18nKey | null; busy: boolean
}

/** One change of that state, in the shape `setState` takes. */
export type EditorUpdate = (state: EditorState) => EditorState

// The shapes of the editor's state, apart from the steps that change it.
