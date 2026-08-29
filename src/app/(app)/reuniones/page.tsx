'use client'
import { useT } from '@/shared/i18n'
import AppShell from '@/shared/components/shell/AppShell'

// Placeholder: la Tarea 6 del plan lo reemplaza por `<ReunionesListado />`. Existe ahora para
// que `routes.test.ts` pase y el rail tenga a dónde navegar.
export default function ReunionesPage() {
  const { t } = useT()
  return <AppShell title={t('reuniones.title')}>{null}</AppShell>
}
