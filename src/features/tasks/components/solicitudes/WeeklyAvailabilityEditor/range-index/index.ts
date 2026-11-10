import type { EditableRange } from '../component-types'
import {
  RANGE_INDEX_NOT_FOUND,
  type RangeIndexInput,
} from './types'

const resolveRangeIndex = ({ ranges, clientId }: RangeIndexInput): number => {
  const matchesClientId = (range: EditableRange) => range.clientId === clientId
  const rangeIndex = ranges.findIndex(matchesClientId)

  if (rangeIndex === RANGE_INDEX_NOT_FOUND) return RANGE_INDEX_NOT_FOUND

  return rangeIndex
}

export default function createRangeIndexFacade() {
  const facade = { resolveRangeIndex }

  return facade
}

// This facade resolves a live editable range position without changing editor state.
