'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'

// Contador de usuarios en línea del topbar.
export default function OnlineBadge() {
  const { onlineCount } = useApp()
  const { t } = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: '#34D39912', border: '1px solid #34D39930' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
      <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>{onlineCount > 0 ? onlineCount : 1} {t('shell.online')}</span>
    </div>
  )
}
