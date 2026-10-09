import type { PostgrestError } from '@supabase/supabase-js'

export type AreaCodeCount = {
  code: string
  label: string
  count: number
}

export type BirthdayMonthCount = {
  month: number
  count: number
}

export type CountResult = { count: number | null; error: PostgrestError | null }

export type PatientDashboardCounts = {
  totalPatients: number
  withEmail: number
  withoutEmail: number
  medianAge: number | null
  minAge: number | null
  maxAge: number | null
  birthdaysThisMonth: number
  birthdaysByMonth: BirthdayMonthCount[]
  gender: { female: number; male: number; unknown: number }
  ageBuckets: {
    child: number
    youngAdult: number
    adult: number
    olderAdult: number
    senior: number
    unknown: number
  }
  areaCodes: AreaCodeCount[]
  dataQuality: DataQualityCounts
}

export type DataQualityCounts = {
  missingEmail: number
  sharedPhone: number | null
  sharedEmail: number | null
  repeatedName: number | null
  typoEmailDomain: number | null
}
