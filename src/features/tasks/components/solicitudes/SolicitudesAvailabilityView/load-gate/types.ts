import type { ReactNode } from 'react'
import type { AvailabilityViewState } from '../types'

/** The load state that decides what shows, and the loaded view shown once it is ready. */
export type LoadGateProps = {
  availability: AvailabilityViewState
  children: ReactNode
}
