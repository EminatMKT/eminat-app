export default function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className="border-b border-gray-200 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ textAlign: align }}>{children}</th>
}
