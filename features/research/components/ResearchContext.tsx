'use client'
import { createContext, useContext } from 'react'
import { useResearchData } from '../hooks/useResearchData'
import { useResearchModals } from '../hooks/useResearchModals'

type ResearchData = ReturnType<typeof useResearchData> & ReturnType<typeof useResearchModals>

const Ctx = createContext<ResearchData | null>(null)

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const data = useResearchData()
  const modals = useResearchModals()
  return <Ctx.Provider value={{ ...data, ...modals }}>{children}</Ctx.Provider>
}

export function useResearch(): ResearchData {
  const v = useContext(Ctx)
  if (!v) throw new Error('useResearch debe usarse dentro de <ResearchProvider>')
  return v
}
