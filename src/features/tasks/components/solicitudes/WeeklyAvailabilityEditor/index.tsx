'use client'
import AvailabilityWeekGrid from '../AvailabilityWeekGrid'
import EditorActions from './EditorActions'
import ValidationBanner from './ValidationBanner'
import useEditorView from './editor-view'
import type { EditorProps } from './types'
import s from './index.module.css'

/** Composes the weekly availability editor's lifecycle, the drag/resize grid, and — when
 *  editable — its validation banner and save/cancel actions. */
export default function WeeklyAvailabilityEditor(props: EditorProps) {
  const { gridProps, bannerProps, actionsProps } = useEditorView(props)

  return <div className={s.editor}>
    <AvailabilityWeekGrid {...gridProps} />
    {bannerProps != null && <ValidationBanner {...bannerProps} />}
    {actionsProps != null && <EditorActions {...actionsProps} />}
  </div>
}

// readOnly skips the banner/actions entirely: useEditorView nulls them out, this just renders.
