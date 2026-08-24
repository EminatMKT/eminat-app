'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { SOCIAL_PLATFORMS } from '@/features/stratix-mkt/data'
import { fNum } from '@/features/stratix-mkt/utils/social-format'
import StatCard from '@/shared/components/dashboard/StatCard'
import Panel from '@/shared/components/dashboard/Panel'
import BrandStats from '../BrandStats'
import PlatformCard from '../PlatformCard'
import ContentSummaryCard from '../ContentSummaryCard'
import s from './index.module.css'

export default function SocialTab() {
  const { accent, marcas } = useApp()
  const { t } = useT()

  const platforms = SOCIAL_PLATFORMS
  const totalFollowers = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.followers, 0), 0)
  const totalGrowth = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.followersChange, 0), 0)
  const totalReach = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.reach, 0), 0)
  const totalPosts = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.posts, 0), 0)
  const avgEngagement = (() => { const all = platforms.flatMap(p => p.accounts); return all.length > 0 ? Math.round(all.reduce((a, ac) => a + ac.engagement, 0) / all.length * 10) / 10 : 0 })()

  const brandTotals = marcas.map(m => {
    const accs = platforms.flatMap(p => p.accounts.filter(a => a.brand === m.codigo))
    // BrandStats tipa `color` como requerido; el catálogo lo declara opcional.
    return { ...m, color: m.color ?? COLOR_MARCA_FALLBACK, followers: accs.reduce((s, a) => s + a.followers, 0), growth: accs.reduce((s, a) => s + a.followersChange, 0), reach: accs.reduce((s, a) => s + a.reach, 0), engagement: accs.length > 0 ? Math.round(accs.reduce((s, a) => s + a.engagement, 0) / accs.length * 10) / 10 : 0, posts: accs.reduce((s, a) => s + a.posts, 0) }
  }).filter(b => b.followers > 0).sort((a, b) => b.followers - a.followers)

  const totalReels = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.reels, 0), 0)
  const totalStories = platforms.reduce((s, p) => s + p.accounts.reduce((a, ac) => a + ac.stories, 0), 0)

  const kpis = [
    { label: t('stratix.social.totalFollowers'), value: fNum(totalFollowers), valueColor: accent, sub: t('stratix.social.thisMonth', { n: fNum(totalGrowth) }), subAccent: true },
    { label: t('stratix.social.totalReach'), value: fNum(totalReach), valueColor: '#60A5FA', sub: t('stratix.social.reached') },
    { label: t('stratix.social.avgEngagement'), value: `${avgEngagement}%`, valueColor: '#34D399', sub: t('stratix.social.avgInteraction') },
    { label: t('stratix.social.postsMonth'), value: String(totalPosts), valueColor: '#F472B6', sub: t('stratix.social.publications') },
    { label: t('stratix.social.growth'), value: `+${Math.round(totalGrowth / Math.max(totalFollowers - totalGrowth, 1) * 100 * 10) / 10}%`, valueColor: '#FBB040', sub: t('stratix.social.currentMonth') },
  ]

  const contentItems = [
    { label: t('stratix.social.reels'), value: totalReels, icon: '🎬', color: '#E1306C' },
    { label: t('stratix.social.stories'), value: totalStories, icon: '📱', color: '#FBB040' },
    { label: t('stratix.social.static'), value: totalPosts - totalReels, icon: '🖼️', color: '#60A5FA' },
    { label: t('stratix.social.totalPieces'), value: totalPosts + totalStories, icon: '📊', color: accent },
  ]

  return (
    <div>
      <div className={s.kpis}>
        {kpis.map(k => (
          <StatCard key={k.label} size="sm" label={k.label} value={k.value} color={k.valueColor}
            badge={k.subAccent ? String(k.sub) : undefined} footnote={k.subAccent ? undefined : String(k.sub)} />
        ))}
      </div>

      <div className={s.marcas}>
        <Panel title={t('stratix.social.byBrand')}>
          <div className={s.grid}>
            {brandTotals.map(b => <BrandStats key={b.codigo} b={b} />)}
          </div>
        </Panel>
      </div>

      {platforms.map(platform => (
        <PlatformCard key={platform.name} platform={platform} />
      ))}

      <Panel title={t('stratix.social.contentSummary')}>
        <div className={s.contenido}>
          {contentItems.map(item => <ContentSummaryCard key={item.label} item={item} />)}
        </div>
      </Panel>
    </div>
  )
}
