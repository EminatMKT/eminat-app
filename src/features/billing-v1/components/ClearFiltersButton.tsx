'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'

export default function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  const { border, t3 } = useApp()
  const { t } = useT()
  return (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t3, fontSize: 11, cursor: 'pointer' }}>✕ {t('cob.clear')}</button>
  )
}
