'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import AppShell from './AppShell'

// Pantalla de acceso denegado, reutilizable por los módulos con gate de permiso.
export default function AccessDenied({ message }: { message?: string }) {
  const { t1, t3 } = useApp()
  const { t } = useT()
  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>{t('common.accessDenied')}</div>
        <div style={{ fontSize: 13, color: t3, textAlign: 'center', maxWidth: 300 }}>{message ?? t('shell.noModuleAccess')}</div>
      </div>
    </AppShell>
  )
}
