'use client'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import useEditorView from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-view'
import useCloseGuard from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/controller/close-guard'
import { MODAL_ANCHO_REM } from '../constants'
import footerOf from '../footer-of'
import type { MemberAvailabilityModalProps } from '../types'

type Footer = ReturnType<typeof footerOf>

function editorPropsOf({ member, onClose, onSaved }: MemberAvailabilityModalProps) {
  const editorProps = {
    member,
    onCancel: onClose,
    onSaved,
    readOnly: !member.canEdit || member.workday === null,
  }

  return editorProps
}

function modalPropsOf(member: AvailabilityMemberDto, onClose: () => void, footer: Footer) {
  const modalProps = {
    title: member.name,
    subtitle: member.team?.name,
    anchoRem: MODAL_ANCHO_REM,
    onClose,
    footer,
  }

  return modalProps
}

/** Owns the editor controller for the modal: one controller feeds the grid/banner bags, the
 *  close guard and the Modal props, so the guard sees the same dirty state the grid edits.
 *  `readOnly` holds unless the member can edit AND has a jornada assigned. */
export default function useModalView(props: MemberAvailabilityModalProps) {
  const { controller, gridProps, bannerProps, actionsProps } = useEditorView(editorPropsOf(props))
  const closeGuard = useCloseGuard(controller, props.onClose)
  const footer = footerOf(actionsProps, closeGuard.requestClose)
  const modal = modalPropsOf(props.member, closeGuard.requestClose, footer)
  const editor = { gridProps, bannerProps }
  const view = { modal, editor, closeGuard }

  return view
}

// Backdrop/✕/Escape and the footer's Cancel all close through the guard, never the raw onClose.
