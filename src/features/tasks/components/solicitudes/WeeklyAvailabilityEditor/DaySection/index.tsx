import { createElement } from 'react'
import { useT } from '@/shared/i18n'
import { compareDailyHours, declaredHoursByDay } from '@/features/tasks/utils/availability'
import { STATUS_COPY_KEYS } from '@/features/tasks/components/solicitudes/MemberAvailabilityCard/constants'
import type { DaySectionProps } from '../component-types'
import EDITOR_COPY from '../constants'
import DAY_SECTION_CONSTANTS from './constants'
import DaySectionContent from './DaySectionContent'
import renderRangeItems from './render-range'
import type {
  DaySectionContentProps,
  DaySectionRangeContext,
} from './types'

export default function DaySection(props: DaySectionProps) {
  const {
    day,
    label,
    ranges,
    expectedHours,
    errors,
    onChangeRange,
    onAddRange,
    onRemoveRange,
  } = props
  const { t } = useT()
  const headingId = `${DAY_SECTION_CONSTANTS.sectionIdPrefix}${day.weekday}`
  const hoursByDay = declaredHoursByDay(ranges)
  const declaredHours = hoursByDay[day.weekday] ?? EDITOR_COPY.zeroHours
  const comparison = compareDailyHours(declaredHours, expectedHours)
  const rangeContext: DaySectionRangeContext = {
    label,
    errors,
    onChangeRange,
    onRemoveRange,
  }
  const renderedRanges = renderRangeItems(ranges, rangeContext)
  const addRange = () => onAddRange(day.weekday)
  const addLabel = EDITOR_COPY.addRange.replace(EDITOR_COPY.dayToken, label)
  const addButtonProps = { label: addLabel, onAdd: addRange }
  const isEmpty = ranges.length === EDITOR_COPY.zeroHours
  const hasErrors = errors.length > EDITOR_COPY.zeroHours
  const comparisonVars = { declared: comparison.declaredHours, expected: comparison.expectedHours ?? EDITOR_COPY.zeroHours }
  const comparisonText = t(STATUS_COPY_KEYS[comparison.status], comparisonVars)
  const contentProps: DaySectionContentProps = {
    headingId,
    label,
    isEmpty,
    hasErrors,
    renderedRanges,
    comparisonText,
    addButtonProps,
  }
  const content = createElement(DaySectionContent, contentProps)

  return <section aria-labelledby={headingId}>{content}</section>
}

// DaySection renders one labeled weekday, its editable ranges, daily hours status, and add action.
