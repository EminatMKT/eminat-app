'use client'
import { Modal } from '@/shared/components/ui'
import WeeklyAvailabilityEditor from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor'
import DiscardChangesModal from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/DiscardChangesModal'
import useModalView from './modal-view'
import type { MemberAvailabilityModalProps } from './types'

/** One editor for view and edit: read-only members get no save/cancel footer. Every way out
 *  (backdrop, ✕, Escape, Cancel) goes through one close guard, which asks before dropping edits. */
export default function MemberAvailabilityModal(props: MemberAvailabilityModalProps) {
  const { modal, editor, closeGuard } = useModalView(props)

  return <>
    <Modal {...modal}>
      <WeeklyAvailabilityEditor {...editor} />
    </Modal>
    {closeGuard.confirming && <DiscardChangesModal {...closeGuard.dialogProps} />}
  </>
}

// Unifies the editable and read-only views of one member's weekly schedule behind one modal, so
// opening any card — the viewer's own or a teammate's — always goes through this single shell.
