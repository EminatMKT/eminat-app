import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { LocalEditorState } from '../component-types'
import createEditorStateFacade from '../editor-state'
import saveAvailability from './index'

afterEach(() => { vi.unstubAllGlobals() })

const MONDAY = 1
const EMPTY_MESSAGE = null
const IDLE_STATUS = 'idle'
const MEMBER_RANGE_ID = 'range-1'
const CLIENT_RANGE_ID = 'client-range-1'
const START_TIME = '09:00'
const END_TIME = '12:00'
const NOTE = 'focus'
const UPDATED_RESPONSE: AvailabilityResponse = { viewerUserId: 'viewer-1', members: [] }
const VALID_STATE: LocalEditorState = {
  ranges: [
    {
      id: MEMBER_RANGE_ID,
      clientId: CLIENT_RANGE_ID,
      weekday: MONDAY,
      startsAt: START_TIME,
      endsAt: END_TIME,
      note: NOTE,
    },
  ],
  status: IDLE_STATUS,
  message: EMPTY_MESSAGE,
  pendingRemoval: null,
}

const { toSaveRanges } = createEditorStateFacade()

describe('WeeklyAvailabilityEditor save flow', () => {
  it('returns validation errors without saving invalid ranges', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const invalidState: LocalEditorState = {
      ...VALID_STATE,
      ranges: [{ ...VALID_STATE.ranges[0], endsAt: START_TIME }],
    }

    const result = await saveAvailability(invalidState)

    expect(result).toEqual({ errors: [{ code: 'end-not-after-start', rangeIndex: 0 }] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('saves valid ranges and returns the refreshed response', async () => {
    const okResult = { ok: true, json: async () => UPDATED_RESPONSE }
    const fetchMock = vi.fn(async () => okResult)
    vi.stubGlobal('fetch', fetchMock)

    const result = await saveAvailability(VALID_STATE)

    expect(result).toEqual({ response: UPDATED_RESPONSE })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/availability',
      expect.objectContaining({ body: JSON.stringify({ ranges: toSaveRanges(VALID_STATE) }) }),
    )
  })

  it('returns a failure when the existing save operation rejects', async () => {
    const failedResult = { ok: false, json: async () => ({}) }
    vi.stubGlobal('fetch', vi.fn(async () => failedResult))

    const result = await saveAvailability(VALID_STATE)

    expect(result).toHaveProperty('error')
    if ('error' in result) expect(result.error).toBeInstanceOf(Error)
  })
})
