'use client'
import { StratixProvider } from './StratixContext'
import StratixContent from './StratixContent'

export default function StratixModule() {
  return (
    <StratixProvider>
      <StratixContent />
    </StratixProvider>
  )
}
