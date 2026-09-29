'use client'
import { useMemo } from 'react'
import { useT } from '@/shared/i18n'
import { useFilters } from '@/shared/hooks'
import { MODULE } from '@/shared/auth/permissions'
import billingFilters from '@/features/billing-v2/domain/billing-filters'

/** The Overview tab's filters — the module's own `useFilters`. */
export default function useBillingFilters() {
  const { t } = useT()
  const defs = useMemo(() => billingFilters({ t }), [t])
  return useFilters(MODULE.COBRANZAS, defs)
}

// `defs` goes memoized on purpose: it is `useFilters`' own input, and a fresh array every render
// would recompute everything downstream of it — same reason `useFiltrosTablero` memoizes its own.
