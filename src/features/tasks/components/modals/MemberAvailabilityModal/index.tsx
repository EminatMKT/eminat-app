'use client'
import { Modal } from '@/shared/components/ui'
import type {
  AvailabilityMemberDto,
  AvailabilityResponse,
} from '@/features/tasks/data/availability/types'
import WeeklyAvailabilityEditor from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor'
import DiscardChangesModal from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/DiscardChangesModal'
import { MODAL_ANCHO_REM } from './constants'
import useModalView from './modal-view'

type Props = {
  member: AvailabilityMemberDto
  onClose: () => void
  onSaved: (response: AvailabilityResponse) => void
}

/** Unifies view and edit for one member's weekly schedule: every card renders the same
 *  `WeeklyAvailabilityEditor`, and `readOnly` — true unless the member can edit AND has a
 *  jornada assigned — decides whether the save/cancel bar shows in the Modal's fixed footer.
 *  Backdrop/✕/Escape and the Cancel button all go through the same close guard. */
export default function MemberAvailabilityModal(props: Props) {
  const { member, onClose, onSaved } = props
  const readOnly = !member.canEdit || member.workday === null
  const editorProps = { member, onCancel: onClose, onSaved, readOnly }
  const { display, closeGuard } = useModalView(editorProps, onClose)

  return <>
    <Modal
      title={member.name}
      subtitle={member.team?.name}
      anchoRem={MODAL_ANCHO_REM}
      onClose={closeGuard.requestClose}
      footer={display.footer}
    >
      <WeeklyAvailabilityEditor gridProps={display.gridProps} bannerProps={display.bannerProps} />
    </Modal>
    {closeGuard.confirming && <DiscardChangesModal {...closeGuard.dialogProps} />}
  </>
}

// Unifies the editable and read-only views of one member's weekly schedule behind one modal, so
// opening any card — the viewer's own or a teammate's — always goes through this single shell.
