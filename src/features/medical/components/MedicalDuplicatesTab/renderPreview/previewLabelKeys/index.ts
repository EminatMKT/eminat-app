import FIELD_MAPS from '@/features/medical/components/MedicalDuplicatesTab/fieldMaps'
import CONTACT_FIELDS from '@/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields'
import type { I18nKey } from '@/shared/i18n'
import type { LabelKeys } from '@/features/medical/components/MedicalDuplicatesTab/fieldMaps/types'

const contactPairs = CONTACT_FIELDS.map(({ key, labelKey }): [string, I18nKey] => [key, labelKey])
const contactLabelKeys: LabelKeys = Object.fromEntries(contactPairs)

/** Every field a patient merge can write, keyed to its label: the clinical ones first, then the
 *  two contact types, in the comparison grid's own order. */
const PREVIEW_LABEL_KEYS: LabelKeys = { ...FIELD_MAPS.labelKeys, ...contactLabelKeys }

export default PREVIEW_LABEL_KEYS

// Built from the grid's two catalogs instead of retyping `telefono`/`email`, so a field the grid
// labels can never reach the preview unnamed.
