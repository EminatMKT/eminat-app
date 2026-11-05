/** Inputs describedByIds needs: whether this field carries an error or a counter. */
export type DescribedByInput = {
  id: string
  error?: string
  counterText?: string
}

/** The ids describedByIds links, plus the combined value RangeField renders. */
export type DescribedByIds = {
  errorId?: string
  counterId?: string
  describedBy?: string
}
