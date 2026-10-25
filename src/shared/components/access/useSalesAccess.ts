'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/shared/db/supabase'

export function useSalesAccess() {
  const pathname = usePathname()
  const nativeRoute = pathname.startsWith('/sales-native')
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (!cancelled) setAllowed(false); return }
      try {
        const response = await fetch(nativeRoute ? '/api/sales-native/access' : '/api/sales/access', {
          cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const body = await response.json() as { allowed?: boolean }
        if (!cancelled) setAllowed(response.ok && body.allowed === true)
      } catch { if (!cancelled) setAllowed(false) }
    }
    void check()
    return () => { cancelled = true }
  }, [nativeRoute])
  return allowed
}
