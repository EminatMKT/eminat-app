'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/shared/db/supabase'

export function useSalesQaAccess() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const response = await fetch('/api/integrations/annie/sales/access', {
          cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const body = await response.json() as { allowed?: boolean }
        if (!cancelled) setAllowed(response.ok && body.allowed === true)
      } catch { if (!cancelled) setAllowed(false) }
    }
    void check()
    return () => { cancelled = true }
  }, [])
  return allowed
}

export function useSalesQaWriteAccess() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const response = await fetch('/api/integrations/annie/sales/access', {
          cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const body = await response.json() as { allowed?: boolean; writeEnabled?: boolean }
        if (!cancelled) setEnabled(response.ok && body.allowed === true && body.writeEnabled === true)
      } catch { if (!cancelled) setEnabled(false) }
    }
    void check()
    return () => { cancelled = true }
  }, [])
  return enabled
}
