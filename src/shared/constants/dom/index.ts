/** The element a pressable surface draws, which is also the ARIA role it is found by. */
export const BUTTON = 'button'

/** The ARIA role a modal declares: how assistive tech, and the e2e, know one is open. */
export const DIALOG = 'dialog'

/** The ARIA role of `h1`–`h6`. */
export const HEADING = 'heading'

/** `KeyboardEvent.key` for the key that confirms. */
export const ENTER = 'Enter'

/** `KeyboardEvent.key` for the key that closes a dialog or a menu. */
export const ESCAPE = 'Escape'

/** `KeyboardEvent.key` for the key that moves the focus. */
export const TAB = 'Tab'

// Names the web platform spells, not the app: a typo in one compiles and then never matches, so
// each is written once here and read by the screens, their unit suites and the e2e alike.
