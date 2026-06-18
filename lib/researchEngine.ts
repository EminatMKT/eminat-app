// Research Engine — data layer (types, constants, scoring, AI placeholder, CRUD).
// Pure TS (no JSX). Talks to Supabase via the shared browser client.
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────
export interface ResearchProject {
  id: string
  name: string
  product_service?: string
  industry?: string
  location?: string
  city?: string
  state?: string
  radius?: number
  target_audience?: string
  year_start?: number
  year_end?: number
  include_social?: boolean
  include_pricing?: boolean
  include_report?: boolean
  status?: string
  created_by?: string
  created_at?: string
}

export interface Competitor {
  id: string; project_id: string; name: string; website?: string; address?: string
  category?: string; rating?: number; review_count?: number; price_level?: string
  strengths?: string; weaknesses?: string; notes?: string; created_at?: string
}
export interface Pricing {
  id: string; project_id: string; competitor_id?: string | null; service_name?: string
  price?: number; unit?: string; notes?: string; created_at?: string
}
export interface SocialProfile {
  id: string; project_id: string; competitor_id?: string | null; platform?: string
  handle?: string; url?: string; followers?: number; engagement_rate?: number
  notes?: string; created_at?: string
}
export interface Insight {
  id: string; project_id: string; source?: string; title?: string; category?: string; content?: string
  executive_summary?: string; market_opportunity?: string; competitor_weakness?: string
  pricing_recommendation?: string; positioning_recommendation?: string
  marketing_recommendation?: string; next_steps?: string; created_at?: string
}
export interface Source {
  id: string; project_id: string; title?: string; url?: string; type?: string; notes?: string; created_at?: string
}
export interface Demographic {
  id: string; project_id: string; metric?: string; label?: string; value?: number; source?: string; created_at?: string
}

// ── Constants ────────────────────────────────────────────────────────────
export const FL_CITIES = [
  'Miramar', 'Miami', 'Broward County', 'Pembroke Pines', 'Weston',
  'Fort Lauderdale', 'Hollywood', 'Hialeah', 'Coral Springs', 'Davie', 'Plantation',
]
export const US_STATES = ['FL', 'GA', 'TX', 'CA', 'NY', 'NJ', 'NC', 'IL']
export const INDUSTRIES = [
  'Healthcare', 'Wellness & Spa', 'Aesthetics', 'Dental', 'Fitness', 'Restaurants',
  'Professional Services', 'Real Estate', 'Retail', 'Education', 'Technology', 'Other',
]
export const SOCIAL_PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Google', 'X', 'Yelp']
export const SOURCE_TYPES = ['website', 'report', 'review', 'social', 'directory', 'news', 'other']
export const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$']

export const RE_BASE = '/research-engine'

// ── Scoring (deterministic, 0-100) ───────────────────────────────────────
export interface ProjectMetrics {
  competitorCount: number
  avgRating: number
  avgReviews: number
  priceMin: number
  priceMax: number
  priceAvg: number
  socialCount: number
  opportunityScore: number
  riskScore: number
  demandScore: number
  competitionScore: number
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function computeMetrics(
  competitors: Competitor[],
  pricing: Pricing[],
  social: SocialProfile[],
  demographics: Demographic[] = []
): ProjectMetrics {
  const competitorCount = competitors.length
  const ratings = competitors.map(c => Number(c.rating)).filter(n => n > 0)
  const reviews = competitors.map(c => Number(c.review_count)).filter(n => n > 0)
  const prices = pricing.map(p => Number(p.price)).filter(n => n > 0)
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  const avgReviews = reviews.length ? Math.round(reviews.reduce((a, b) => a + b, 0) / reviews.length) : 0
  const priceMin = prices.length ? Math.min(...prices) : 0
  const priceMax = prices.length ? Math.max(...prices) : 0
  const priceAvg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const socialCount = social.length

  // Competition: more competitors + stronger competitors → higher.
  const competitionScore = clamp(competitorCount * 9 + avgRating * 6)

  // Demand: total review volume is the proxy (more reviews = more active market).
  // Blend in a population demographic if present.
  const totalReviews = reviews.reduce((a, b) => a + b, 0)
  const pop = Number(demographics.find(d => d.metric === 'population')?.value) || 0
  const demandScore = clamp(Math.log10(Math.max(totalReviews, 1)) * 22 + (pop > 0 ? Math.log10(pop) * 6 : 25))

  // Opportunity: high demand, low competition, weaknesses present → higher.
  const weaknessSignal = competitors.filter(c => (c.weaknesses || '').trim()).length * 5
  const opportunityScore = clamp(demandScore * 0.6 + (100 - competitionScore) * 0.4 + weaknessSignal)

  // Risk: strong, dense competition → higher risk.
  const riskScore = clamp(competitionScore * 0.7 + avgRating * 5)

  return {
    competitorCount, avgRating, avgReviews, priceMin, priceMax, priceAvg, socialCount,
    opportunityScore, riskScore, demandScore, competitionScore,
  }
}

export const scoreColor = (n: number) =>
  n >= 70 ? '#10b981' : n >= 45 ? '#fdcb6e' : '#e17055'

export const money = (n: number) =>
  '$' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

// ── AI Insight Generator (Phase 1 placeholder) ───────────────────────────
// Aggregates the project data into a structured insight object. Deterministic;
// swap the body for a real Claude call later without changing callers.
export function generateAIInsights(
  project: ResearchProject,
  competitors: Competitor[],
  pricing: Pricing[],
  social: SocialProfile[],
  sources: Source[]
): Omit<Insight, 'id' | 'project_id' | 'created_at'> {
  const m = computeMetrics(competitors, pricing, social)
  const area = [project.city, project.state].filter(Boolean).join(', ') || project.location || 'the target market'
  const offering = project.product_service || project.industry || 'this offering'
  const topRated = [...competitors].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0]
  const weakest = [...competitors].sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0))[0]
  const priceLine = m.priceMin
    ? `Observed pricing ranges ${money(m.priceMin)}–${money(m.priceMax)} (avg ${money(m.priceAvg)}).`
    : 'No pricing captured yet — add entries for a sharper recommendation.'

  return {
    source: 'ai',
    title: `AI Insights — ${project.name}`,
    executive_summary:
      `${offering} in ${area} shows a demand score of ${m.demandScore}/100 against a competition score of ${m.competitionScore}/100, ` +
      `yielding an opportunity score of ${m.opportunityScore}/100. ${competitors.length} competitors mapped` +
      `${topRated?.name ? `, led by ${topRated.name} (${Number(topRated.rating) || '—'}★).` : '.'} ${priceLine}`,
    market_opportunity:
      m.opportunityScore >= 60
        ? `Favorable entry window: demand outpaces the competitive density in ${area}. Prioritize fast positioning while incumbents are slow to differentiate.`
        : `Moderate opportunity in ${area}. Differentiation and a sharp niche will be required to win share from ${competitors.length} established players.`,
    competitor_weakness:
      weakest?.weaknesses
        ? `${weakest.name} is most exposed: ${weakest.weaknesses}. Across the set, recurring gaps are service consistency and digital presence.`
        : `Competitors show thin digital footprints (${m.socialCount} social profiles tracked). Weak online engagement is the clearest exploitable gap.`,
    pricing_recommendation:
      m.priceAvg
        ? `Anchor near the market average (${money(m.priceAvg)}) with a premium tier ~15% above to signal quality, and an entry tier ~10% below ${money(m.priceMin)} to capture trial.`
        : `Capture competitor pricing first. As a default, position with a clear good/better/best ladder rather than competing on a single price.`,
    positioning_recommendation:
      `Position ${offering} as the trustworthy, modern choice in ${area} — emphasize responsiveness and outcomes over price. ` +
      `Own the gaps left by ${topRated?.name || 'incumbents'}.`,
    marketing_recommendation:
      `Lead with local SEO and Google Business reviews (the dominant discovery channel here), then layer Instagram/Facebook for ${project.target_audience || 'the target audience'}. ` +
      `Goal: out-rate and out-publish competitors who average ${m.avgRating ? m.avgRating.toFixed(1) : '—'}★.`,
    next_steps:
      `1) Complete competitor & pricing capture (${competitors.length} / ${pricing.length} so far). ` +
      `2) Audit top-3 competitor social. 3) Validate demand with a local landing-page test. ` +
      `4) Finalize pricing ladder. 5) Generate the executive report (${sources.length} sources cited).`,
  }
}

// ── Report assembly ──────────────────────────────────────────────────────
export function buildReport(args: {
  project: ResearchProject; metrics: ProjectMetrics; competitors: Competitor[]
  pricing: Pricing[]; social: SocialProfile[]; insights: Insight[]; sources: Source[]
}) {
  const ai = args.insights.find(i => i.source === 'ai')
  return {
    title: `Market Research Report — ${args.project.name}`,
    executive_summary: ai?.executive_summary || '',
    market_opportunity: ai?.market_opportunity || '',
    competitor_weakness: ai?.competitor_weakness || '',
    pricing_recommendation: ai?.pricing_recommendation || '',
    positioning_recommendation: ai?.positioning_recommendation || '',
    marketing_recommendation: ai?.marketing_recommendation || '',
    next_steps: ai?.next_steps || '',
    metrics: args.metrics,
    counts: {
      competitors: args.competitors.length, pricing: args.pricing.length,
      social: args.social.length, sources: args.sources.length,
    },
  }
}

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

// Generic per-project loaders / mutators for the child entities.
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
