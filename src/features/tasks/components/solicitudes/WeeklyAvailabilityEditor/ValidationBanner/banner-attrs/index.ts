import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import { VALIDATION_ID, VALIDATION_LIVE, VALIDATION_TAB_INDEX } from '../constants'
import type { ValidationBannerProps } from '../types'
import s from '../index.module.css'

/** The validation banner's div attributes: focus-targetable, announced assertively. */
export default function buildBannerAttrs({ focusRef }: ValidationBannerProps) {
  const identity = { className: s.validation, id: VALIDATION_ID, ref: focusRef }
  const live = {
    role: EDITOR_COPY.alertRole,
    'aria-live': VALIDATION_LIVE,
    tabIndex: VALIDATION_TAB_INDEX,
  }

  return { ...identity, ...live }
}

// This module builds the validation banner's rendering attributes from the shared copy keys.
