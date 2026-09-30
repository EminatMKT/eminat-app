import type { I18nKey } from '@/shared/i18n'

type FollowUpOptions = {
  marked: string
  unmarked: string
  markedKey: I18nKey
  unmarkedKey: I18nKey
  values: string[]
}

const followUpOptions: FollowUpOptions = {
  marked: String(true),
  unmarked: String(false),
  markedKey: 'billing.followUp.on',
  unmarkedKey: 'billing.followUp.off',
  values: [String(true), String(false)],
}

export default followUpOptions

// The module owns the stored follow-up filter values and their translation keys.
