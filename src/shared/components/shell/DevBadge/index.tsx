'use client'
import { useT } from '@/shared/i18n'
import { isDevDb, clientEnv } from '@/shared/db/env.client'

// Indicador "DEV" — solo visible cuando se trabaja contra la base de DESARROLLO.
export default function DevBadge() {
  const { t } = useT()
  if (!isDevDb) return null
  return (
    <span title={clientEnv.NEXT_PUBLIC_APP_ENV === 'staging' ? 'Isolated staging — synthetic records only' : t('shell.devTooltip')} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', fontFamily: 'DM Mono', background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B55', flexShrink: 0 }}>{clientEnv.NEXT_PUBLIC_APP_ENV === 'staging' ? 'STAGING' : 'DEV'}</span>
  )
}
