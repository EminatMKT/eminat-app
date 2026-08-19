'use client'
import { createContext, useContext } from 'react'
import { useCobranzasData } from '../hooks/useCobranzasData'

type CobranzasData = ReturnType<typeof useCobranzasData>

const Ctx = createContext<CobranzasData | null>(null)

export function CobranzasProvider({ children }: { children: React.ReactNode }) {
  const data = useCobranzasData()
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useCobranzas(): CobranzasData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCobranzas debe usarse dentro de <CobranzasProvider>')
  return v
}
