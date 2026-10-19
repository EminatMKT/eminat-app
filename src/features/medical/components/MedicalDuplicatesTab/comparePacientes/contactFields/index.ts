import CONTACT_TYPE from '@/features/medical/constants/contactType'
import type { ContactField } from './types'

/** The contact types a patient merge shows as checkboxes, in screen order. */
const CONTACT_FIELDS: ContactField[] = [
  { key: CONTACT_TYPE.phone, labelKey: 'med.field.telefono' },
  { key: CONTACT_TYPE.email, labelKey: 'med.field.email' },
]

export default CONTACT_FIELDS

// Read by both the comparison grid and `buildReviewMergeValues`, so the fields shown as checkboxes
// and the fields whose exclusions are enforced can never drift apart.
