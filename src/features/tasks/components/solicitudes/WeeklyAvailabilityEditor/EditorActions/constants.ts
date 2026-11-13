/** Element tags, button kinds and the empty tone EditorActions renders with. */
export const EDITOR_ACTIONS = {
  containerTag: 'div',
  feedbackTag: 'p',
  cancel: 'cancel',
  confirm: 'confirm',
  noTone: '',
} as const

// Kept beside EditorActions so its render helpers share one literal home instead of repeating it.
