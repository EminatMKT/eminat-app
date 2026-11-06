import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import EDITOR_COPY
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import { VALIDATION_ID, VALIDATION_LIVE, VALIDATION_TAB_INDEX } from '../constants'
import buildBannerAttrs from './index'

const MESSAGE = 'tasks.availability.validationSummary'

describe('buildBannerAttrs', () => {
  it('builds the focus-targetable, assertively-announced attributes for the banner', () => {
    const focusRef = createRef<HTMLDivElement>()
    const attrs = buildBannerAttrs({ message: MESSAGE, focusRef })

    expect(attrs.id).toBe(VALIDATION_ID)
    expect(attrs.role).toBe(EDITOR_COPY.alertRole)
    expect(attrs['aria-live']).toBe(VALIDATION_LIVE)
    expect(attrs.tabIndex).toBe(VALIDATION_TAB_INDEX)
    expect(attrs.ref).toBe(focusRef)
  })
})
