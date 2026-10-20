'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/shared/db/supabase'

export function useSalesQaAccess() {
  const pathname = usePathname()
  const nativePreview = pathname.startsWith('/sales-native')
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (!cancelled) setAllowed(false); return }
      try {
        const response = await fetch(nativePreview ? '/api/sales-native/access' : '/api/sales/access', {
          cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const body = await response.json() as { allowed?: boolean }
        if (!cancelled) setAllowed(response.ok && body.allowed === true)
      } catch { if (!cancelled) setAllowed(false) }
    }
    void check()
    return () => { cancelled = true }
  }, [nativePreview])
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

export function useSalesQaContactWriteAccess() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const response = await fetch('/api/integrations/annie/sales/access', {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await response.json() as { allowed?: boolean; contactWriteEnabled?: boolean }
      if (!cancelled) setEnabled(response.ok && body.allowed === true && body.contactWriteEnabled === true)
    }).catch(() => { if (!cancelled) setEnabled(false) })
    return () => { cancelled = true }
  }, [])
  return enabled
}

export function useSalesQaAccountWriteAccess() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const response = await fetch('/api/integrations/annie/sales/access', {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await response.json() as { allowed?: boolean; accountWriteEnabled?: boolean }
      if (!cancelled) setEnabled(response.ok && body.allowed === true && body.accountWriteEnabled === true)
    }).catch(() => { if (!cancelled) setEnabled(false) })
    return () => { cancelled = true }
  }, [])
  return enabled
}

export function useSalesQaOpportunityWriteAccess() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const response = await fetch('/api/integrations/annie/sales/access', {
        cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await response.json() as { allowed?: boolean; opportunityWriteEnabled?: boolean }
      if (!cancelled) setEnabled(response.ok && body.allowed === true && body.opportunityWriteEnabled === true)
    }).catch(() => { if (!cancelled) setEnabled(false) })
    return () => { cancelled = true }
  }, [])
  return enabled
}
