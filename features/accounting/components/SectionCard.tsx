'use client'
import { useApp } from '@/shared/context/AppContext'

export default function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { s1, border, t1, t3 } = useApp()
  return (
    <div className="mb-4 rounded-xl p-5 shadow-sm" style={{ background: s1, border: `1px solid ${border}` }}>
      <div className="mb-4">
        <div className="text-base font-bold" style={{ color: t1 }}>{title}</div>
        {subtitle && <div className="mt-0.5 text-xs" style={{ color: t3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}
