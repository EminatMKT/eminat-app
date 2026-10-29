import { createElement, Fragment } from 'react'
import AddRangeButton from '../AddRangeButton'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import DAY_SECTION_CONSTANTS from '../constants'
import type { DaySectionContentProps } from '../types'

export default function DaySectionContent(props: DaySectionContentProps) {
  const {
    headingId,
    label,
    isEmpty,
    hasErrors,
    renderedRanges,
    comparisonText,
    addButtonProps,
  } = props
  const headingProps = { id: headingId }
  const heading = createElement(DAY_SECTION_CONSTANTS.headingTag, headingProps, label)
  const emptyMessage = isEmpty
    ? createElement(DAY_SECTION_CONSTANTS.paragraphTag, DAY_SECTION_CONSTANTS.noProps, EDITOR_COPY.emptyDay)
    : DAY_SECTION_CONSTANTS.noProps
  const validationProps = { role: 'alert', 'aria-live': 'assertive' }
  const validationMessage = hasErrors
    ? createElement(DAY_SECTION_CONSTANTS.paragraphTag, validationProps, EDITOR_COPY.validationError)
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
