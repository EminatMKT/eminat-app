import { createElement } from 'react'
import type { ReactElement } from 'react'
import DaySection from '../DaySection'
import type { DaySectionProps } from '../component-types'
import type { EditorViewModelDay } from '../editor-view-model/types'
import type { DayElements, DayElementsInput } from './types'

const buildDayElement = (viewModelDay: EditorViewModelDay, input: DayElementsInput): ReactElement => {
  const { translate, onChangeRange, onAddRange, onRemoveRange } = input
  const label = translate(viewModelDay.day.labelKey)
  const dayProps: DaySectionProps = {
    ...viewModelDay,
    label,
    onChangeRange,
    onAddRange,
    onRemoveRange,
  }
  const dayAttributes = { ...dayProps, key: viewModelDay.day.weekday }
  const element = createElement(DaySection, dayAttributes)
  return element
}

/** Builds the seven named DaySection elements WeeklyAvailabilityEditorComposition's props require. */
export default function buildDayElements(input: DayElementsInput): DayElements {
  const { viewModel } = input
  const elements: DayElements = {
    monday: buildDayElement(viewModel.monday, input),
    tuesday: buildDayElement(viewModel.tuesday, input),
    wednesday: buildDayElement(viewModel.wednesday, input),
    thursday: buildDayElement(viewModel.thursday, input),
    friday: buildDayElement(viewModel.friday, input),
    saturday: buildDayElement(viewModel.saturday, input),
    sunday: buildDayElement(viewModel.sunday, input),
  }
  return elements
}

// Isolated from index.tsx so the top-level component stays within the file's line ceiling.
