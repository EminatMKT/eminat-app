'use client'
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import {
  getProject, loadChildren, insertChild, updateChild, deleteChild,
  computeMetrics,
  type ResearchProject, type Competitor, type Pricing, type SocialProfile,
  type Insight, type Source, type Demographic, type ChildKind, type ProjectMetrics,
} from '@/lib/researchEngine'

interface Ctx {
  loading: boolean
  project: ResearchProject | null
  competitors: Competitor[]
  pricing: Pricing[]
  social: SocialProfile[]
  insights: Insight[]
  sources: Source[]
  demographics: Demographic[]
  metrics: ProjectMetrics
  add: (kind: ChildKind, row: any) => Promise<void>
  update: (kind: ChildKind, id: string, row: any) => Promise<void>
  remove: (kind: ChildKind, id: string) => Promise<void>
  reload: () => Promise<void>
}

const ProjectCtx = createContext<Ctx | undefined>(undefined)

const STATE_KEYS: Record<ChildKind, keyof Omit<Ctx, 'loading' | 'project' | 'metrics' | 'add' | 'update' | 'remove' | 'reload'>> = {
  competitors: 'competitors', pricing: 'pricing', social: 'social',
  insights: 'insights', sources: 'sources', demographics: 'demographics',
}

export function ProjectProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<ResearchProject | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [social, setSocial] = useState<SocialProfile[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [demographics, setDemographics] = useState<Demographic[]>([])

  const setters: Record<string, (v: any) => void> = {
    competitors: setCompetitors, pricing: setPricing, social: setSocial,
    insights: setInsights, sources: setSources, demographics: setDemographics,
  }

  const reload = useCallback(async () => {
    setLoading(true)
    const [p, kids] = await Promise.all([getProject(projectId), loadChildren(projectId)])
    setProject(p)
    setCompetitors(kids.competitors); setPricing(kids.pricing); setSocial(kids.social)
    setInsights(kids.insights); setSources(kids.sources); setDemographics(kids.demographics)
    setLoading(false)
  }, [projectId])

  useEffect(() => { reload() }, [reload])

  const add = useCallback(async (kind: ChildKind, row: any) => {
    const created = await insertChild(kind, { ...row, project_id: projectId })
    setters[STATE_KEYS[kind]]((prev: any[]) => [created, ...prev])
  }, [projectId])

  const update = useCallback(async (kind: ChildKind, id: string, row: any) => {
    const updated = await updateChild(kind, id, row)
    setters[STATE_KEYS[kind]]((prev: any[]) => prev.map(x => x.id === id ? updated : x))
  }, [])

  const remove = useCallback(async (kind: ChildKind, id: string) => {
    await deleteChild(kind, id)
    setters[STATE_KEYS[kind]]((prev: any[]) => prev.filter(x => x.id !== id))
  }, [])

  const metrics = computeMetrics(competitors, pricing, social, demographics)

  return (
    <ProjectCtx.Provider value={{ loading, project, competitors, pricing, social, insights, sources, demographics, metrics, add, update, remove, reload }}>
      {children}
    </ProjectCtx.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectCtx)
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider')
  return ctx
}
