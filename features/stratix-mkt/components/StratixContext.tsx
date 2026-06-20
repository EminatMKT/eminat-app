'use client'
import { createContext, useContext } from 'react'
import { useStratixData } from '../hooks/useStratixData'

type StratixData = ReturnType<typeof useStratixData>

const Ctx = createContext<StratixData | null>(null)

export function StratixProvider({ children }: { children: React.ReactNode }) {
  const data = useStratixData()
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useStratix(): StratixData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStratix debe usarse dentro de <StratixProvider>')
  return v
}
