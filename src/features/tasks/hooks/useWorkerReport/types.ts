import type { Dispatch, SetStateAction } from 'react'
import type { Row, PrintContext } from '@/features/tasks/components/reporte/WorkerReport/types'

/** State the fetch effect owns: rows, error and whether a fetch is in flight, since a settled
 *  fetch always overwrites the stale value of the others. `loading` is optional so a stubbed,
 *  already-settled report (tests) doesn't have to spell it out. */
export type FetchState = {
  tasks: Row[]
  error: string
  loading?: boolean
}

export type SetFetchState = Dispatch<SetStateAction<FetchState>>
export type Translate = PrintContext['t']
