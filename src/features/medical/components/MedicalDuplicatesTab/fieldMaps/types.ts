import type { Paciente } from '@/features/medical/types'
import type { I18nKey } from '@/shared/i18n'

export type LabelKeys = Record<string, I18nKey>
export type ValueGetters = Record<string, (patient: Paciente) => string>
