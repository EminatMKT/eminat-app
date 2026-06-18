// Global Digital Insights — Supabase CRUD layer. Pure logic (types, constants,
// scoring, AI generator, report assembly) lives in researchEngineCore and is
// re-exported here, so existing imports from '@/lib/researchEngine' keep working.
import { supabase } from '@/lib/supabase'
import type {
  ResearchProject, Competitor, Pricing, SocialProfile, Insight, Source, Demographic,
} from './researchEngineCore'

export * from './researchEngineCore'

// ── CRUD helpers ─────────────────────────────────────────────────────────
const TABLES = {
  competitors: 'competitors',
  pricing: 'competitor_pricing',
  social: 'social_profiles',
  insights: 'research_insights',
  sources: 'research_sources',
  demographics: 'market_demographics',
} as const

export async function listProjects() {
  const { data } = await supabase.from('research_projects').select('*').order('created_at', { ascending: false })
  return (data || []) as ResearchProject[]
}
export async function getProject(id: string) {
  const { data } = await supabase.from('research_projects').select('*').eq('id', id).single()
  return data as ResearchProject | null
}
export async function createProject(p: Partial<ResearchProject>) {
  const { data, error } = await supabase.from('research_projects').insert([p]).select()
  if (error) throw error
  return data![0] as ResearchProject
}
export async function deleteProject(id: string) {
  const { error } = await supabase.from('research_projects').delete().eq('id', id)
  if (error) throw error
}

export async function loadChildren(projectId: string) {
  const [comp, pric, soc, ins, src, demo] = await Promise.all([
    supabase.from(TABLES.competitors).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from(TABLES.pricing).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from(TABLES.social).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from(TABLES.insights).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from(TABLES.sources).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from(TABLES.demographics).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
  ])
  return {
    competitors: (comp.data || []) as Competitor[],
    pricing: (pric.data || []) as Pricing[],
    social: (soc.data || []) as SocialProfile[],
    insights: (ins.data || []) as Insight[],
    sources: (src.data || []) as Source[],
    demographics: (demo.data || []) as Demographic[],
  }
}

export type ChildKind = keyof typeof TABLES
export async function insertChild(kind: ChildKind, row: any) {
  const { data, error } = await supabase.from(TABLES[kind]).insert([row]).select()
  if (error) throw error
  return data![0]
}
export async function updateChild(kind: ChildKind, id: string, row: any) {
  const { data, error } = await supabase.from(TABLES[kind]).update(row).eq('id', id).select()
  if (error) throw error
  return data![0]
}
export async function deleteChild(kind: ChildKind, id: string) {
  const { error } = await supabase.from(TABLES[kind]).delete().eq('id', id)
  if (error) throw error
}
