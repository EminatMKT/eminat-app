import type { I18nKey } from '@/shared/i18n'

/** How the reason names one field: its label in words, and whether its box is still empty. */
export type SaveField = { name: string; label: string; blank: boolean }

/** Every field's current error, by field. A field that is fine is absent or empty. */
export type SaveErrors = Readonly<Partial<Record<string, string>>>

/** The translator the reason is written with. */
export type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string

// The shapes a form hands its Save to, apart from the piece so a feature can type what it builds
// —its field list, its errors— without importing the component.
