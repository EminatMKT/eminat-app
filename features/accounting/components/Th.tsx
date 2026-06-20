'use client'
import { useApp } from '@/shared/context/AppContext'

export default function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  const { border, t3 } = useApp()
  return <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ textAlign: align, color: t3, borderBottom: `1px solid ${border}` }}>{children}</th>
}
