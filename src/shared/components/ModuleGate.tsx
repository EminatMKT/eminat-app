'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { moduleForPath } from '@/shared/auth/permissions'
import { writeUserPreference, LAST_MODULE_KEY } from '@/shared/hooks/useUserPreference'
import AccessDenied from './AccessDenied'

// Gate central por módulo: una sola fuente de verdad (antes cada módulo lo hacía suelto y se
// olvidaron stratix-mkt/accounting/directorio/th-hr). Home (slug null) siempre pasa.
export default function ModuleGate({ children }: { children: React.ReactNode }) {
  const { modules, loading, usuario } = useApp()
  const slug = moduleForPath(usePathname())

  // Último módulo visitado, para el atajo del Launchpad. Se anota acá porque es el único punto
  // que ya resuelve el slug para TODAS las rutas protegidas; ponerlo en cada módulo sería
  // repetirlo siete veces y olvidarlo en el octavo. Solo se anota lo que el usuario pudo ver:
  // si no tiene acceso, el gate corta y no se guarda.
  const allowed = !!slug && modules.includes(slug)
  const userId: string | undefined = usuario?.id
  useEffect(() => {
    if (!allowed || !slug || !userId) return
    writeUserPreference(userId, LAST_MODULE_KEY, slug)
  }, [allowed, slug, userId])

  if (!loading && slug && !modules.includes(slug)) {
    return <AccessDenied message="You do not have access to this module. Contact your administrator." />
  }
  return <>{children}</>
}
