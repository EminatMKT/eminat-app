'use client'
import { useApp } from '@/shared/context/AppContext'
import { fNum } from './social-format'

type BrandTotal = { codigo: string; color: string; followers: number; growth: number; reach: number; engagement: number; posts: number }

export default function BrandStats({ b }: { b: BrandTotal }) {
  const { border, t1, t2, t3 } = useApp()
  return (
    <div style={{ padding: '14px', borderRadius: 12, border: `1px solid ${border}`, background: `${b.color}08` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: b.color }}>{b.codigo}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', color: t1 }}>{fNum(b.followers)}</div>
      <div style={{ fontSize: 10, color: '#34D399', marginTop: 2 }}>+{fNum(b.growth)} · {b.engagement}% eng</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <div style={{ fontSize: 10, color: t3 }}><span style={{ fontWeight: 600, color: t2 }}>{fNum(b.reach)}</span> reach</div>
        <div style={{ fontSize: 10, color: t3 }}><span style={{ fontWeight: 600, color: t2 }}>{b.posts}</span> posts</div>
      </div>
    </div>
  )
}
