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
 *  `WeeklyAvailabilityEditor`, and `readOnly` — driven by `member.canEdit` — decides whether
 *  the save/cancel bar shows in the Modal's fixed footer, never a second component.
 *  Backdrop/✕/Escape go through the close guard; the Cancel button closes directly. */
export default function MemberAvailabilityModal(props: Props) {
  const { member, onClose, onSaved } = props
  const editorProps = { member, onCancel: onClose, onSaved, readOnly: !member.canEdit }
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
