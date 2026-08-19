// Datos estáticos de los tabs Social y Competencia. Copiados verbatim del
// page.tsx original — no cambiar valores.

export type SocialAccount = {
  handle: string
  brand: string
  followers: number
  followersChange: number
  posts: number
  reach: number
  engagement: number
  impressions: number
  stories: number
  reels: number
  bestPost: string
  bestReach: number
}

export type SocialPlatform = {
  name: string
  icon: string
  color: string
  accounts: SocialAccount[]
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { name: 'Instagram', icon: '📸', color: '#E1306C', accounts: [
    { handle: '@eminatmedicalcenter', brand: 'EMC', followers: 12840, followersChange: 342, posts: 28, reach: 48200, engagement: 4.2, impressions: 156000, stories: 45, reels: 12, bestPost: 'Reel — Skin treatments', bestReach: 18400 },
    { handle: '@soyvivintegrete', brand: 'SVN', followers: 45200, followersChange: 1205, posts: 35, reach: 125600, engagement: 5.8, impressions: 420000, stories: 62, reels: 18, bestPost: 'Reel — Wellness routine', bestReach: 52300 },
    { handle: '@eminatresearch', brand: 'ERG', followers: 3420, followersChange: 89, posts: 14, reach: 8900, engagement: 3.1, impressions: 28500, stories: 18, reels: 5, bestPost: 'Post — Clinical study results', bestReach: 4200 },
    { handle: '@premierbodysculpt', brand: 'PREMIER', followers: 8650, followersChange: 412, posts: 22, reach: 32100, engagement: 4.8, impressions: 98000, stories: 34, reels: 10, bestPost: 'Reel — Body transformation', bestReach: 14800 },
    { handle: '@ornella.ia', brand: 'ORNELLA', followers: 2180, followersChange: 680, posts: 18, reach: 15200, engagement: 6.2, impressions: 45000, stories: 22, reels: 8, bestPost: 'Reel — AI in healthcare', bestReach: 8900 },
  ]},
  { name: 'Facebook', icon: '👤', color: '#1877F2', accounts: [
    { handle: 'Eminat Medical Center', brand: 'EMC', followers: 8900, followersChange: 120, posts: 22, reach: 34500, engagement: 2.8, impressions: 89000, stories: 0, reels: 8, bestPost: 'Video — Center tour', bestReach: 12400 },
    { handle: 'Soy Vivi Negrete', brand: 'SVN', followers: 28400, followersChange: 580, posts: 30, reach: 78000, engagement: 3.4, impressions: 245000, stories: 0, reels: 14, bestPost: 'Live — Health Q&A', bestReach: 32100 },
    { handle: 'Premier by Eminat', brand: 'PREMIER', followers: 5200, followersChange: 185, posts: 16, reach: 18900, engagement: 3.1, impressions: 52000, stories: 0, reels: 6, bestPost: 'Video — Before and after', bestReach: 8700 },
  ]},
  { name: 'TikTok', icon: '🎵', color: '#010101', accounts: [
    { handle: '@soyvivintegrete', brand: 'SVN', followers: 18600, followersChange: 3200, posts: 24, reach: 285000, engagement: 8.4, impressions: 890000, stories: 0, reels: 24, bestPost: 'Nutrition tips', bestReach: 145000 },
    { handle: '@eminatmedical', brand: 'EMC', followers: 4200, followersChange: 890, posts: 16, reach: 62000, engagement: 6.1, impressions: 198000, stories: 0, reels: 16, bestPost: 'A day at the clinic', bestReach: 28000 },
    { handle: '@ornella.ia', brand: 'ORNELLA', followers: 1850, followersChange: 1200, posts: 20, reach: 95000, engagement: 9.2, impressions: 310000, stories: 0, reels: 20, bestPost: 'AI predicts your health', bestReach: 42000 },
  ]},
  { name: 'LinkedIn', icon: '💼', color: '#0A66C2', accounts: [
    { handle: 'Eminat Group', brand: 'EMC', followers: 2400, followersChange: 68, posts: 12, reach: 9800, engagement: 2.2, impressions: 24000, stories: 0, reels: 0, bestPost: 'Article — Healthcare innovation', bestReach: 3200 },
    { handle: 'Eminat Research Group', brand: 'ERG', followers: 1890, followersChange: 145, posts: 10, reach: 12400, engagement: 3.8, impressions: 31000, stories: 0, reels: 0, bestPost: 'Paper — Clinical trial results', bestReach: 5600 },
  ]},
  { name: 'YouTube', icon: '▶️', color: '#FF0000', accounts: [
    { handle: 'Soy Vivi Negrete', brand: 'SVN', followers: 6800, followersChange: 420, posts: 8, reach: 42000, engagement: 4.5, impressions: 128000, stories: 0, reels: 4, bestPost: 'Podcast — Holistic health', bestReach: 18500 },
    { handle: 'Eminat Medical', brand: 'EMC', followers: 1200, followersChange: 95, posts: 4, reach: 8400, engagement: 3.2, impressions: 22000, stories: 0, reels: 2, bestPost: 'Procedures explained', bestReach: 4800 },
  ]},
]

export type Competitor = {
  name: string
  tipo: string
  ubicacion: string
  website: string
  instagram: string
  igFollowers: number
  igEngagement: number
  facebook: string
  fbFollowers: number
  tiktok: string
  tkFollowers: number
  fortalezas: string[]
  debilidades: string[]
  servicios: string[]
  precioRango: string
  googleRating: number
  googleReviews: number
  tendencia: 'creciendo' | 'estable' | 'bajando'
}

export const COMPETITORS: Competitor[] = [
  {
    name: 'Miami Dade Medical Group',
    tipo: 'Medical Center',
    ubicacion: 'Doral, FL',
    website: 'miamidademedical.com',
    instagram: '@miamidademedical',
    igFollowers: 22400,
    igEngagement: 3.2,
    facebook: 'Miami Dade Medical',
    fbFollowers: 15800,
    tiktok: '@miamidademedical',
    tkFollowers: 8900,
    fortalezas: ['High patient volume', 'Strategic location in Doral', 'Bilingual service'],
    debilidades: ['Generic branding', 'Undifferentiated content', 'No research program'],
    servicios: ['General Medicine', 'Emergency', 'Laboratory', 'Radiology'],
    precioRango: '$$',
    googleRating: 4.2,
    googleReviews: 342,
    tendencia: 'estable',
  },
  {
    name: 'Brickell Aesthetics Center',
    tipo: 'Aesthetics & Wellness',
    ubicacion: 'Brickell, FL',
    website: 'brickellaesthetics.com',
    instagram: '@brickellaesthetics',
    igFollowers: 38200,
    igEngagement: 5.1,
    facebook: 'Brickell Aesthetics',
    fbFollowers: 12400,
    tiktok: '@brickellaesthetics',
    tkFollowers: 15600,
    fortalezas: ['Strong social media presence', 'High-quality content', 'Influencer partnerships'],
    debilidades: ['High prices', 'Aesthetics only — no medical services', 'Very niche focus'],
    servicios: ['Body Sculpting', 'Facial Treatments', 'IV Therapy', 'Botox/Fillers'],
    precioRango: '$$$',
    googleRating: 4.6,
    googleReviews: 189,
    tendencia: 'creciendo',
  },
  {
    name: 'South Florida Health Hub',
    tipo: 'Multi-specialty',
    ubicacion: 'Kendall, FL',
    website: 'sfhealthhub.com',
    instagram: '@sfhealthhub',
    igFollowers: 9800,
    igEngagement: 2.4,
    facebook: 'South Florida Health Hub',
    fbFollowers: 21000,
    tiktok: '',
    tkFollowers: 0,
    fortalezas: ['Large physician network', 'Multiple insurance plans', 'Modern facilities'],
    debilidades: ['Weak social media', 'No TikTok', 'Corporate branding with no personality'],
    servicios: ['General Medicine', 'Cardiology', 'Dermatology', 'Orthopedics'],
    precioRango: '$$',
    googleRating: 3.9,
    googleReviews: 567,
    tendencia: 'bajando',
  },
  {
    name: 'Coral Gables Wellness Institute',
    tipo: 'Wellness & Research',
    ubicacion: 'Coral Gables, FL',
    website: 'cgwellness.com',
    instagram: '@cgwellnessinstitute',
    igFollowers: 14500,
    igEngagement: 4.3,
    facebook: 'CG Wellness Institute',
    fbFollowers: 8900,
    tiktok: '@cgwellness',
    tkFollowers: 5200,
    fortalezas: ['Holistic wellness focus', 'Clinical trials', 'High medical trust'],
    debilidades: ['Exclusive premium pricing', 'Conservative marketing', 'Slow social media growth'],
    servicios: ['Clinical Research', 'Functional Medicine', 'Nutrition', 'Mental Health'],
    precioRango: '$$$',
    googleRating: 4.7,
    googleReviews: 124,
    tendencia: 'creciendo',
  },
  {
    name: 'LatinCare Medical Centers',
    tipo: 'Medical Center',
    ubicacion: 'Hialeah, FL',
    website: 'latincare.com',
    instagram: '@latincaremedical',
    igFollowers: 16700,
    igEngagement: 3.8,
    facebook: 'LatinCare Medical',
    fbFollowers: 28900,
    tiktok: '@latincaremedical',
    tkFollowers: 12300,
    fortalezas: ['Strong Hispanic community', 'Affordable prices', 'High Facebook volume'],
    debilidades: ['Single-segment dependency', 'Repetitive content', 'No LinkedIn presence'],
    servicios: ['Family Medicine', 'Pediatrics', 'Gynecology', 'Laboratory'],
    precioRango: '$',
    googleRating: 4.0,
    googleReviews: 892,
    tendencia: 'estable',
  },
]

// Eminat data for comparison (competencia tab).
export const EMINAT_DATA = {
  igFollowers: 12840 + 45200 + 3420 + 8650 + 2180,
  fbFollowers: 8900 + 28400 + 5200,
  tkFollowers: 18600 + 4200 + 1850,
  avgEngagement: 4.8,
  googleRating: 4.8,
  googleReviews: 234,
}

export const TENDENCIA_COLORS: Record<string, string> = { creciendo: '#34D399', estable: '#FBB040', bajando: '#F87171' }
export const TENDENCIA_ICONS: Record<string, string> = { creciendo: '📈', estable: '➡️', bajando: '📉' }
