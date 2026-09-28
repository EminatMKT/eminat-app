'use client'
import { useT } from '@/shared/i18n'
import { useCrashRecovery } from '@/shared/hooks'
import { SHOW } from '@/shared/utils'
import { Button } from '@/shared/components/ui'
import LoadingScreen from '../LoadingScreen'
import CrashFrame from '../CrashFrame'

type Props = { error: Error }

const reloadPage = () => window.location.reload()

export default function CrashNotice({ error }: Props) {
  const { t } = useT()
  const step = useCrashRecovery(error)
  if (step !== SHOW) return <LoadingScreen />

  return (
    <CrashFrame part="screen">
      <CrashFrame part="heading">{t('shell.crashTitle')}</CrashFrame>
      <CrashFrame part="text">{t('shell.crashBody')}</CrashFrame>
      <Button kind="retry" label={t('shell.crashReload')} onClick={reloadPage} />
    </CrashFrame>
  )
}

// What the error boundaries show instead of a spinner that never ends. A missing chunk gets one
// automatic reload first (`useCrashRecovery`); anything else, or a second failure, lands here
// with a button, so the way out is always one click and never a loop.
