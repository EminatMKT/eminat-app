'use client'
import { useT } from '@/shared/i18n'
import { Modal } from '@/shared/components/ui'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import usePopoverController, { type PopoverControllerResult } from './controller'
import buildPopoverFields, { type PopoverFields } from './popover-fields'
import buildFieldsInput from './fields-input'
import renderFields from './fields-view'
import PopoverFooter from './PopoverFooter'
import type { PopoverFooterExtras, PopoverProps } from './types'

type SimpleTranslator = (key: string) => string

function renderError(controller: PopoverControllerResult, t: SimpleTranslator) {
  if (!controller.error) return null

  return <p role={EDITOR_COPY.alertRole}>{t(EDITOR_COPY.validationError)}</p>
}
function renderBody(props: PopoverProps, controller: PopoverControllerResult, t: SimpleTranslator) {
  const fields = buildPopoverFields(buildFieldsInput(props, controller), t)

  return <>
    {renderError(controller, t)}
    {renderFields(fields)}
  </>
}
function footerExtras(t: SimpleTranslator, onCancel: () => void): PopoverFooterExtras {
  return { confirmationMessage: t(EDITOR_COPY.removeConfirm), onCancel }
}
function buildFooter(controller: PopoverControllerResult, extras: PopoverFooterExtras) {
  const { canSave, save, remove } = controller

  return <PopoverFooter canSave={canSave} onSave={save} onRemove={remove} {...extras} />
}

/** One range's edit/view dialog: a thin composition of the controller (local draft + save/remove),
 *  the three RangeFields it shows, and the footer that disappears entirely when `readOnly`. */
export default function Popover(props: PopoverProps) {
  const { dayLabel, readOnly, onClose } = props
  const { t } = useT()
  const controller = usePopoverController(props)
  const footer = readOnly ? undefined : buildFooter(controller, footerExtras(t, onClose))

  return <Modal title={dayLabel} footer={footer} onClose={onClose}>
    {renderBody(props, controller, t)}
  </Modal>
}

// Popover stays a thin composition: usePopoverController owns the draft/validation, popover-fields
// owns reusing AvailabilityRangeItem's field-building logic, PopoverFooter owns the three actions.
