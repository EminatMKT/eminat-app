import type { I18nKey } from '@/shared/i18n'
import type CONTACT_TYPE from '@/features/medical/constants/contactType'

/** A multivalued contact field: which `PatientUnderReview` list it reads, and its label. */
export type ContactField = { key: (typeof CONTACT_TYPE)[keyof typeof CONTACT_TYPE]; labelKey: I18nKey }
