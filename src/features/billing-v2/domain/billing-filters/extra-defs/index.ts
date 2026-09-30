import type { FilterDef } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { BillingV2Record } from '@/shared/data'
import amountDef from '../amount-def'
import followUpDef from '../follow-up-def'
import payeeDef from '../payee-def'
import recordTypeDef from '../record-type-def'
import textDef from '../text-def'

type Deps = { t: (k: I18nKey) => string }

export default function extraDefs({ t }: Deps): FilterDef<BillingV2Record>[] {
  return [payeeDef, amountDef, followUpDef(t), recordTypeDef(t), textDef]
}

// The module gathers the additional Billing summary filters that need localized option labels.
