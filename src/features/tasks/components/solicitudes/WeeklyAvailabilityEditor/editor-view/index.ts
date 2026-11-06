'use client'
import { useT } from '@/shared/i18n'
import useWeeklyAvailabilityEditorController from '../controller'
import buildGridProps from '../grid-props'
import useValidationBanner from '../use-validation-banner'
import buildActionsProps from '../actions-props'
import type { EditorProps } from '../types'

/** The editor's one stateful hook: composes the controller and derives everything index.tsx
 *  needs to render — gating the banner and actions on readOnly, never on missing errors. */
export default function useEditorView(props: EditorProps) {
  const controller = useWeeklyAvailabilityEditorController(props)
  const { t } = useT()
  const gridProps = buildGridProps(props, controller)
  const banner = useValidationBanner(controller, t)
  const bannerProps = props.readOnly ? null : banner
  const actionsProps = props.readOnly ? null : buildActionsProps(controller)

  return { gridProps, bannerProps, actionsProps }
}

// useValidationBanner always runs so hook order never depends on readOnly, which only gates render.
