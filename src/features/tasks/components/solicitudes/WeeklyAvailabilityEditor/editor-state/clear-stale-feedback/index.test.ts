import { describe, expect, it } from 'vitest'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import clearStaleFeedback from './index'
import type { SettledFeedback } from './types'

const NO_PENDING_REMOVAL = null

describe('clearStaleFeedback', () => {
  it('resets a saved status/message to idle', () => {
    const settled: SettledFeedback = {
      status: EDITOR_COPY.savedStatus,
      message: EDITOR_COPY.saved,
      pendingRemoval: NO_PENDING_REMOVAL,
    }

    const next = clearStaleFeedback(settled)

    expect(next.status).toBe(EDITOR_COPY.idleStatus)
    expect(next.message).toBeNull()
  })

  it('resets an error status/message to idle', () => {
    const settled: SettledFeedback = {
      status: EDITOR_COPY.errorStatus,
      message: EDITOR_COPY.saveError,
      pendingRemoval: NO_PENDING_REMOVAL,
    }

    const next = clearStaleFeedback(settled)

    expect(next.status).toBe(EDITOR_COPY.idleStatus)
    expect(next.message).toBeNull()
  })

  it('leaves an in-flight save untouched', () => {
    const saving: SettledFeedback = {
      status: EDITOR_COPY.savingStatus,
      message: null,
      pendingRemoval: NO_PENDING_REMOVAL,
    }

    const next = clearStaleFeedback(saving)

    expect(next.status).toBe(EDITOR_COPY.savingStatus)
  })
})
