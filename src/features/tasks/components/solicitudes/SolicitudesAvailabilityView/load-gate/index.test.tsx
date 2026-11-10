import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LoadingView } from '@/shared/components/ui'
import {
  AVAILABILITY_VIEW_STATUS,
  INITIAL_AVAILABILITY_STATE,
  LOAD_ERROR_KEY,
} from '../constants'
import type { AvailabilityViewState } from '../types'
import LoadGate from './index'

const VIEW_MARKER = 'loaded-view-marker'
const mocked = vi.hoisted(() => ({ i18n: '@/shared/i18n' }))

vi.mock(mocked.i18n, () => ({ useT: () => ({ t: (key: string) => key }) }))

const draw = (availability: AvailabilityViewState) =>
  renderToStaticMarkup(<LoadGate availability={availability}>{VIEW_MARKER}</LoadGate>)

describe('LoadGate', () => {
  it('shows the loading notice, not the view, while availability is still loading', () => {
    const html = draw(INITIAL_AVAILABILITY_STATE)

    expect(html).toBe(renderToStaticMarkup(<LoadingView />))
    expect(html).not.toContain(VIEW_MARKER)
  })

  it('shows the load error, not the view, when the request failed', () => {
    const failed: AvailabilityViewState = {
      status: AVAILABILITY_VIEW_STATUS.error,
      members: [],
      error: LOAD_ERROR_KEY,
    }
    const html = draw(failed)

    expect(html).toContain(LOAD_ERROR_KEY)
    expect(html).not.toContain(VIEW_MARKER)
  })

  it('shows the view once the availability is loaded, even when it is empty', () => {
    const empty: AvailabilityViewState = {
      status: AVAILABILITY_VIEW_STATUS.empty,
      members: [],
      error: null,
    }

    expect(draw(empty)).toContain(VIEW_MARKER)
  })
})
