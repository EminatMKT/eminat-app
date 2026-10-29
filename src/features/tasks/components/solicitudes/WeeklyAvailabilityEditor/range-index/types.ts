import type {
  EditableRange,
  LocalEditorState,
} from '../component-types'

export const RANGE_INDEX_NOT_FOUND = -1

/** The client id and current editable ranges needed to resolve an index. */
export type RangeIndexInput = Pick<LocalEditorState, 'ranges'> &
  Pick<EditableRange, 'clientId'>
