'use client'
import { useT } from '@/shared/i18n'
import useWeeklyAvailabilityEditorController from '../controller'
import buildGridProps from '../grid-props'
import useValidationBanner from '../use-validation-banner'
import buildActionsProps from '../actions-props'
import type { WeeklyAvailabilityEditorControllerResult } from '../controller/types'
import type { EditorProps } from '../types'

function useDerivedProps(props: EditorProps, controller: WeeklyAvailabilityEditorControllerResult) {
  const { t } = useT()
  const gridProps = buildGridProps(props, controller)
  const banner = useValidationBanner(controller, t)
  const bannerProps = props.readOnly ? null : banner
  const actionsProps = props.readOnly ? null : buildActionsProps(controller)
  const derived = { gridProps, bannerProps, actionsProps }

  return derived
}

/** Composes the controller and derives the grid/banner/actions prop bags its caller renders,
 *  plus the controller itself so a caller can also gate closing on `isDirty`/`onSave`. */
export default function useEditorView(props: EditorProps) {
  const controller = useWeeklyAvailabilityEditorController(props)
  const derived = useDerivedProps(props, controller)
  const view = { controller, ...derived }

  return view
}

// useValidationBanner always runs so hook order never depends on readOnly, which only gates render.
