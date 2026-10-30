import { createElement, Fragment } from 'react'
import { useT } from '@/shared/i18n'
import AddRangeButton from '../AddRangeButton'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import DAY_SECTION_CONSTANTS, {
  DAY_VALIDATION_SUMMARY_KEY,
  NO_INVALID_RANGES_IN_DAY,
} from '../constants'
import type { DaySectionContentProps } from '../types'

export default function DaySectionContent(props: DaySectionContentProps) {
  const {
    headingId,
    label,
    isEmpty,
    invalidRangeCount,
    renderedRanges,
    comparisonText,
    addButtonProps,
  } = props
  const { t } = useT()
  const headingProps = { id: headingId }
  const heading = createElement(DAY_SECTION_CONSTANTS.headingTag, headingProps, label)
  const emptyMessage = isEmpty
    ? createElement(DAY_SECTION_CONSTANTS.paragraphTag, DAY_SECTION_CONSTANTS.noProps, t(EDITOR_COPY.emptyDay))
    : DAY_SECTION_CONSTANTS.noProps
  const validationProps = { role: 'alert', 'aria-live': 'assertive' }
  const summaryVars = { count: invalidRangeCount }
  const daySummaryCopy = t(DAY_VALIDATION_SUMMARY_KEY, summaryVars)
  const validationMessage = invalidRangeCount > NO_INVALID_RANGES_IN_DAY
    ? createElement(DAY_SECTION_CONSTANTS.paragraphTag, validationProps, daySummaryCopy)
    : DAY_SECTION_CONSTANTS.noProps
  const rangesContent = isEmpty ? DAY_SECTION_CONSTANTS.noProps : renderedRanges
  const statusProps = { role: EDITOR_COPY.statusRole }
  const statusMessage = createElement(DAY_SECTION_CONSTANTS.paragraphTag, statusProps, comparisonText)
  const addButton = createElement(AddRangeButton, addButtonProps)
  const content = createElement(
    Fragment,
    DAY_SECTION_CONSTANTS.noProps,
    heading,
    emptyMessage,
    validationMessage,
    rangesContent,
    statusMessage,
    addButton,
  )
  return content
}

// DaySectionContent presents the weekday heading, draft states, comparison, and scoped add action.
