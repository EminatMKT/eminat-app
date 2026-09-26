'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import TopbarLayout from '@/shared/components/shell/TopbarLayout'

/** How many people are online, in the topbar. On a phone it folds to the dot and the number. */
export default function TopbarPresence() {
  const { onlineCount } = useApp()
  const { t } = useT()
  // Whoever is looking is online, even before presence has counted anyone.
  const n = onlineCount > 0 ? onlineCount : 1
  return (
    <TopbarLayout part="online">
      <TopbarLayout part="wide">{t('shell.online', { n })}</TopbarLayout>
      <TopbarLayout part="narrow">{n}</TopbarLayout>
    </TopbarLayout>
  )
}

// The presence pill of the topbar (it was OnlineBadge). Its skin is the topbar's `online` piece, so
// the phone rules of the whole bar live in one stylesheet, at one breakpoint.
