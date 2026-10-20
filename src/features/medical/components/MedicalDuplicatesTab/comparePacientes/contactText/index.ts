import type { ContactView } from '@/features/medical/components/MedicalDuplicatesTab/types'

/** A contact row's display text: what the checkboxes merge both sides by, and what the preview lists. */
const contactText = ({ valor }: ContactView) => valor

export default contactText

// Shared by the comparison grid and the merge preview, so both group contact rows by the same text.
