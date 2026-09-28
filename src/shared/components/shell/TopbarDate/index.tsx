'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { longDay, shortMoment } from '@/shared/utils'
import TopbarLayout from '@/shared/components/shell/TopbarLayout'

export default function TopbarDate() {
  const { horaActual } = useApp()
  const { t, intlLocale } = useT()
  // The clock ticks every second through the context, so `now` is fresh on every render.
  const now = new Date()
  const wide = t('shell.dayAndTime', { day: longDay(now, intlLocale), time: horaActual })
  return (
    <TopbarLayout part="date">
      <TopbarLayout part="wide">{wide}</TopbarLayout>
      <TopbarLayout part="narrow">{shortMoment(now, intlLocale)}</TopbarLayout>
    </TopbarLayout>
  )
}

// Today's date in the topbar: the whole day on a wide screen, "26 sept, 5:47 p. m." on a phone,
// where the whole day took five lines.
