import type { I18nKey } from '@/shared/i18n'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'

/** All the engine needs from a multivalued element: a way to tell it apart from the rest. */
export type MultiValueItem = { id: string }

/** What every compared field carries, scalar or multivalued. */
export type FieldBase = { labelKey: I18nKey; controls: CompareControls }

/** A plain field: the winner's and the loser's value, resolved by picking one. */
export type ScalarFieldProps = FieldBase & { field: string; values: [string, string] }

/** A multivalued field: both sides' lists, resolved by unchecking what not to keep. `textOf` is
 *  how one element reads on screen, and what makes two elements "the same value". */
export type MultiFieldProps<E extends MultiValueItem> = FieldBase & { values: [E[], E[]]; textOf: (item: E) => string }

/** Either kind; which one is decided by the values' shape, never by the field's name. */
export type Props<E extends MultiValueItem> = ScalarFieldProps | MultiFieldProps<E>

/** One distinct value across both sides: the winner's ids always stay, the loser's can be dropped. */
export type MultiValueRow = { text: string; keptIds: string[]; removableIds: string[] }
