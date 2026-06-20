'use client'
import { useApp } from '@/shared/context/AppContext'
import { fNum, cardStyle, badgeStyle } from './social-format'
import AccountRow from './AccountRow'
import type { SocialPlatform } from '../../data'

const ACCOUNT_HEADERS = ['Account', 'Brand', 'Followers', 'Growth', 'Posts', 'Reach', 'Engagement', 'Impressions', 'Best Post']

export default function PlatformCard({ platform }: { platform: SocialPlatform }) {
  const { s1, border, t1, t3 } = useApp()
  return (
    <div style={{ ...cardStyle(s1, border), marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{platform.icon}</span>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1 }}>{platform.name}</span>
        <span style={badgeStyle(platform.color)}>{platform.accounts.length} accounts</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: t3 }}>Total: <span style={{ fontWeight: 700, color: t1 }}>{fNum(platform.accounts.reduce((s, a) => s + a.followers, 0))}</span> followers</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${border}` }}>
            {ACCOUNT_HEADERS.map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {platform.accounts.map(acc => (
            <AccountRow key={acc.handle} acc={acc} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
