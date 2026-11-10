import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { AVAILABILITY_ENDPOINT } from '@/features/tasks/data/availability/constants'
import { NINE_AM, NOON } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import type { LocalEditorState } from '../component-types'
import createEditorStateFacade from '../editor-state'
import { FIRST_RANGE_ID } from '../test-fixtures/constants'
import saveAvailability from './index'

afterEach(() => { vi.unstubAllGlobals() })

const fetchGlobal = 'fetch'
const MONDAY = 1
const EMPTY_MESSAGE = null
const IDLE_STATUS = 'idle'
const CLIENT_RANGE_ID = 'client-range-1'
const NOTE = 'focus'
const UPDATED_RESPONSE = { viewerUserId: 'viewer-1', members: [] }
const VALID_STATE: LocalEditorState = {
  ranges: [
    {
      id: FIRST_RANGE_ID,
      clientId: CLIENT_RANGE_ID,
      weekday: MONDAY,
      startsAt: NINE_AM,
      endsAt: NOON,
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
    const invalidState: LocalEditorState = {
      ...VALID_STATE,
      ranges: [{ ...VALID_STATE.ranges[0], endsAt: NINE_AM }],
    }

    vi.stubGlobal(fetchGlobal, fetchMock)

    const result = await saveAvailability(invalidState)

    expect(result).toEqual({ errors: [{ code: 'end-not-after-start', rangeIndex: 0 }] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('saves valid ranges and returns the refreshed response', async () => {
    const okResult = { ok: true, json: async () => UPDATED_RESPONSE }
    const fetchMock = vi.fn(async () => okResult)
    const expectedBody = JSON.stringify({ ranges: toSaveRanges(VALID_STATE) })
    const expectedInit = expect.objectContaining({ body: expectedBody })

    vi.stubGlobal(fetchGlobal, fetchMock)

    const result = await saveAvailability(VALID_STATE)

    expect(result).toEqual({ response: UPDATED_RESPONSE })
    expect(fetchMock).toHaveBeenCalledWith(AVAILABILITY_ENDPOINT, expectedInit)
  })

  it('returns a failure when the existing save operation rejects', async () => {
    const failedResult = { ok: false, json: async () => ({}) }

    vi.stubGlobal(fetchGlobal, vi.fn(async () => failedResult))

    const result = await saveAvailability(VALID_STATE)

    expect('error' in result).toBe(true)

    if ('error' in result) expect(result.error).toBeInstanceOf(Error)
  })
})
