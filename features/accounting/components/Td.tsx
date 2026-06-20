'use client'
import { useApp } from '@/shared/context/AppContext'

export default function Td({ children, align = 'left', mono = false, color, bold = false }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean; color?: string; bold?: boolean }) {
  const { border, t1 } = useApp()
  return <td className={`px-3 py-2.5 text-xs ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`} style={{ textAlign: align, color: color || t1, borderBottom: `1px solid ${border}` }}>{children}</td>
}
