import type { I18nKey } from '@/shared/i18n'
import type { BillingRecordType, RecordForm } from '@/features/billing-v2/components/RecordEditor/types'
import type { EditorState, EditorUpdate } from './types'

const editorState = {
  open: (form: RecordForm): EditorState => ({ initial: form, form, left: [], attempts: 0, failure: null, busy: false }),
  edit: (name: keyof RecordForm, value: string | boolean): EditorUpdate => (s) => ({ ...s, form: { ...s.form, [name]: value } }),
  leave: (name: keyof RecordForm): EditorUpdate => (s) => (s.left.includes(name) ? s : { ...s, left: [...s.left, name] }),
  pick: (recordType: BillingRecordType): EditorUpdate => (s) => ({ ...s, form: { ...s.form, recordType } }),
  attempted: ((s) => ({ ...s, attempts: s.attempts + 1 })) satisfies EditorUpdate,
  sending: ((s) => ({ ...s, busy: true, failure: null })) satisfies EditorUpdate,
  failed: (failure: I18nKey): EditorUpdate => (s) => ({ ...s, busy: false, failure }),
}

/** Every change the record editor's state goes through, each as a pure step. */
export default editorState

// The editor's life as data, apart from React: the hook only hands these to `setState`. What the
// form opened with is kept beside what it holds now, which is how "nothing changed" is told. The
// errors are not stored at all — they are recomputed from the boxes on every change — so what is
// kept is only when to show them: the boxes left, and whether Save already met an invalid form.
