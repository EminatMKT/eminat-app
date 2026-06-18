'use client'
import { createContext, useContext } from 'react'
import { useMedicalData } from '../hooks/useMedicalData'

type MedicalData = ReturnType<typeof useMedicalData>

const Ctx = createContext<MedicalData | null>(null)

export function MedicalProvider({ children }: { children: React.ReactNode }) {
  const data = useMedicalData()
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useMedical(): MedicalData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMedical debe usarse dentro de <MedicalProvider>')
  return v
}
