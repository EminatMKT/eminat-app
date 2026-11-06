import type { ControllerResult } from '../controller/types'
import type { EditorProps } from '../types'

/** `AvailabilityWeekGrid`'s own prop shape: the member's workday, plus the editor's live state. */
export default function buildGridProps(props: EditorProps, controller: ControllerResult) {
  const { member, readOnly } = props
  const { state, onChangeRanges } = controller
  const data = { ranges: state.ranges, workday: member.workday }
  const behavior = { readOnly, onChange: onChangeRanges }

  return { ...data, ...behavior }
}

// Isolated so useEditorView and WeeklyAvailabilityEditor both stay within their own line budget.
