export default function Td({ children, align = 'left', mono = false, color, bold = false }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean; color?: string; bold?: boolean }) {
  return <td className={`border-b border-gray-100 px-3 py-2.5 text-xs ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`} style={{ textAlign: align, color: color || '#111827' }}>{children}</td>
}
