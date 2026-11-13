import type { CreateRangeInput } from '../types'

/** Creation needs only the target day and snapped bounds. */
export type BuildRangeInput = Pick<CreateRangeInput, 'day' | 'bounds'>
