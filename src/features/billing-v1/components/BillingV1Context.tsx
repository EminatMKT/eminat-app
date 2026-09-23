'use client'
import { createContext, useContext } from 'react'
import { useBillingV1Data } from '../hooks/useBillingV1Data'

type BillingV1Data = ReturnType<typeof useBillingV1Data>

const Ctx = createContext<BillingV1Data | null>(null)

export function BillingV1Provider({ children }: { children: React.ReactNode }) {
  const data = useBillingV1Data()
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useBillingV1(): BillingV1Data {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBillingV1 must be used inside <BillingV1Provider>')
  return v
}
