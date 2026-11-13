import type { SaveOutcomeInput } from '../save-decision/types'

/** Context resolveSaveOutcome needs before the save flow produces its own result. */
export type ResolveSaveOutcomeInput = Omit<SaveOutcomeInput, 'result'>
