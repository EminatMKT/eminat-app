'use client'
import { Modal } from '@/shared/components/ui'
import type {
  AvailabilityMemberDto,
  AvailabilityResponse,
} from '@/features/tasks/data/availability/types'
import WeeklyAvailabilityEditor from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor'
import AvailabilitySchedule from '@/features/tasks/components/solicitudes/AvailabilitySchedule'
import { MODAL_ANCHO_REM } from './constants'

type Props = {
  member: AvailabilityMemberDto
  onClose: () => void
  onSaved: (response: AvailabilityResponse) => void
}

/** Unifies view and edit for one member's weekly schedule: the viewer's own card renders the
 *  editable `WeeklyAvailabilityEditor`, any other card renders the read-only `AvailabilitySchedule`
 *  — same component, same content either way, never a second shell for "view" vs "edit". */
export default function MemberAvailabilityModal(props: Props) {
  const { member, onClose, onSaved } = props

  return (
    <Modal
      title={member.name}
      subtitle={member.team?.name}
      anchoRem={MODAL_ANCHO_REM}
      onClose={onClose}
    >
      {member.canEdit
        ? (
          <WeeklyAvailabilityEditor
            member={member}
            onCancel={onClose}
            onSaved={onSaved}
            readOnly={false}
          />
        )
        : <AvailabilitySchedule member={member} />}
    </Modal>
  )
}

// Unifies the editable and read-only views of one member's weekly schedule behind one modal, so
// opening any card — the viewer's own or a teammate's — always goes through this single shell.
