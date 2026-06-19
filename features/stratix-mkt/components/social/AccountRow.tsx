'use client'
import { useApp, getColorMarca } from '@/shared/context/AppContext'
import { fNum, badgeStyle } from './social-format'
import type { SocialAccount } from '../../data'

export default function AccountRow({ acc }: { acc: SocialAccount }) {
  const { border, t1, t2, t3 } = useApp()
  return (
    <tr key={acc.handle} style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '10px', color: t1, fontWeight: 500 }}>{acc.handle}</td>
      <td style={{ padding: '10px' }}><span style={badgeStyle(getColorMarca(acc.brand))}>{acc.brand}</span></td>
      <td style={{ padding: '10px', fontWeight: 700, color: t1, fontFamily: 'DM Mono' }}>{fNum(acc.followers)}</td>
      <td style={{ padding: '10px', color: '#34D399', fontFamily: 'DM Mono' }}>+{fNum(acc.followersChange)}</td>
      <td style={{ padding: '10px', color: t2, fontFamily: 'DM Mono' }}>{acc.posts}</td>
      <td style={{ padding: '10px', color: t2, fontFamily: 'DM Mono' }}>{fNum(acc.reach)}</td>
      <td style={{ padding: '10px' }}><span style={badgeStyle(acc.engagement >= 5 ? '#34D399' : acc.engagement >= 3 ? '#FBB040' : '#F87171')}>{acc.engagement}%</span></td>
      <td style={{ padding: '10px', color: t3, fontFamily: 'DM Mono' }}>{fNum(acc.impressions)}</td>
      <td style={{ padding: '10px' }}>
        <div style={{ fontSize: 11, color: t2 }}>{acc.bestPost}</div>
        <div style={{ fontSize: 9, color: t3 }}>{fNum(acc.bestReach)} reach</div>
      </td>
    </tr>
  )
}
