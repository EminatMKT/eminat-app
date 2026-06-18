export default function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>
}
