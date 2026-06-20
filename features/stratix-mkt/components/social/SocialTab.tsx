'use client'
import { useApp, MARCAS_LIST } from '@/shared/context/AppContext'
import { SOCIAL_PLATFORMS } from '../../data'
import { fNum, cardStyle } from './social-format'
import SocialKpiCard from './SocialKpiCard'
import BrandStats from './BrandStats'
import PlatformCard from './PlatformCard'
import ContentSummaryCard from './ContentSummaryCard'

export default function SocialTab() {
  const { s1, border, accent, t1 } = useApp()

  const platforms = SOCIAL_PLATFORMS
  const totalFollowers = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.followers, 0), 0)
  const totalGrowth = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.followersChange, 0), 0)
  const totalReach = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.reach, 0), 0)
  const totalPosts = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.posts, 0), 0)
  const avgEngagement = (() => { const all = platforms.flatMap(p => p.accounts); return all.length > 0 ? Math.round(all.reduce((a, ac) => a + ac.engagement, 0) / all.length * 10) / 10 : 0 })()

  const brandTotals = MARCAS_LIST.map(m => {
    const accs = platforms.flatMap(p => p.accounts.filter(a => a.brand === m.codigo))
    return { ...m, followers: accs.reduce((s, a) => s + a.followers, 0), growth: accs.reduce((s, a) => s + a.followersChange, 0), reach: accs.reduce((s, a) => s + a.reach, 0), engagement: accs.length > 0 ? Math.round(accs.reduce((s, a) => s + a.engagement, 0) / accs.length * 10) / 10 : 0, posts: accs.reduce((s, a) => s + a.posts, 0) }
  }).filter(b => b.followers > 0).sort((a, b) => b.followers - a.followers)

  const totalReels = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.reels, 0), 0)
  const totalStories = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.stories, 0), 0)

  const kpis = [
    { label: 'Total Followers', value: fNum(totalFollowers), valueColor: accent, sub: `+${fNum(totalGrowth)} this month`, subAccent: true },
    { label: 'Total Reach', value: fNum(totalReach), valueColor: '#60A5FA', sub: 'people reached' },
    { label: 'Avg Engagement', value: `${avgEngagement}%`, valueColor: '#34D399', sub: 'average interaction' },
    { label: 'Posts This Month', value: String(totalPosts), valueColor: '#F472B6', sub: 'publications' },
    { label: 'Growth', value: `+${Math.round(totalGrowth / Math.max(totalFollowers - totalGrowth, 1) * 100 * 10) / 10}%`, valueColor: '#FBB040', sub: 'current month' },
  ]

  const contentItems = [
    { label: 'Reels / Videos', value: totalReels, icon: '🎬', color: '#E1306C' },
    { label: 'Stories', value: totalStories, icon: '📱', color: '#FBB040' },
    { label: 'Static Posts', value: totalPosts - totalReels, icon: '🖼️', color: '#60A5FA' },
    { label: 'Total Pieces', value: totalPosts + totalStories, icon: '📊', color: accent },
  ]

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <SocialKpiCard key={k.label} kpi={k} />
        ))}
      </div>

      {/* Brand Performance */}
      <div style={{ ...cardStyle(s1, border), marginBottom: 16 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Performance by Brand</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(brandTotals.length, 5)}, 1fr)`, gap: 12 }}>
          {brandTotals.map(b => (
            <BrandStats key={b.codigo} b={b} />
          ))}
        </div>
      </div>

      {/* Platform Details */}
      {platforms.map(platform => (
        <PlatformCard key={platform.name} platform={platform} />
      ))}

      {/* Content Calendar Summary */}
      <div style={cardStyle(s1, border)}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Monthly Content Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {contentItems.map(item => (
            <ContentSummaryCard key={item.label} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
