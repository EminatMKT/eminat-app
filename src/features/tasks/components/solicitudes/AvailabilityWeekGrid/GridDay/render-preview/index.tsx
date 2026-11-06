import { PIXELS_PER_MINUTE } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import CreatePreview from '../CreatePreview'

type PreviewBounds = Parameters<typeof CreatePreview>[0]['bounds']

/** The track's live create-drag ghost: nothing while no gesture is in progress, a CreatePreview
 *  at the gesture's current bounds once one is — mirrors render-track's own null-vs-render
 *  split, so the branch stays colocated with its own test. */
export default function renderPreview(bounds: PreviewBounds | null) {
  if (bounds === null) return null

  return <CreatePreview bounds={bounds} pxPerMin={PIXELS_PER_MINUTE} />
}

// Kept apart from GridDay itself, mirroring render-track's own file split for the same reason.
