'use client'
import { StratixProvider } from '../StratixContext'
import { STRATIX_TAB, STRATIX_TABS, STRATIX_TAB_PREF } from '@/features/stratix-mkt/constants/tabs'
import StratixContent from '../StratixContent'

export default function StratixModule() {
  return (
    <StratixProvider prefKey={STRATIX_TAB_PREF} tabs={STRATIX_TABS} tabInicial={STRATIX_TAB.SOCIAL}>
      <StratixContent />
    </StratixProvider>
  )
}
