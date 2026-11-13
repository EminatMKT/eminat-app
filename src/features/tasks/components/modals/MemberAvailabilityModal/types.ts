import type {
  AvailabilityMemberDto,
  AvailabilityResponse,
} from '@/features/tasks/data/availability/types'

/** What a member card hands the modal: whose week to show, and how to report back. */
export type MemberAvailabilityModalProps = {
  member: AvailabilityMemberDto
  onClose: () => void
  onSaved: (response: AvailabilityResponse) => void
}
