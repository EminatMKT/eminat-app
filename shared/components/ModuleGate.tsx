'use client'
import { usePathname } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { moduleForPath } from '@/shared/auth/permissions'
import AccessDenied from './AccessDenied'

// Gate central por módulo: una sola fuente de verdad (antes cada módulo lo hacía suelto y se
// olvidaron stratix-mkt/accounting/directorio/th-hr). Home (slug null) siempre pasa.
export default function ModuleGate({ children }: { children: React.ReactNode }) {
  const { modules, loading } = useApp()
  const slug = moduleForPath(usePathname())
  if (!loading && slug && !modules.includes(slug)) {
    return <AccessDenied message="You do not have access to this module. Contact your administrator." />
  }
  return <>{children}</>
}
