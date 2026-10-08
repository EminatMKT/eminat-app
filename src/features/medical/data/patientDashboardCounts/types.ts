export type AreaCodeCount = {
  code: string
  label: string
  count: number
}

export type PatientDashboardCounts = {
  totalPatients: number
  withEmail: number
  withoutEmail: number
  medianAge: number | null
  minAge: number | null
  maxAge: number | null
  birthdaysThisMonth: number | null
  birthdaysByMonth: { month: number; count: number }[] | null
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
  dataQuality: {
    missingEmail: number
    sharedPhone: number | null
    sharedEmail: number | null
    repeatedName: number | null
    typoEmailDomain: number | null
  }
}
