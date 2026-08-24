export default function ErrorBlock({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <div style={{ padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'rgba(248,113,113,.10)', border: '1px solid rgba(248,113,113,.35)', color: '#F87171', fontSize: 12, lineHeight: 1.5 }}>
      {msg}
    </div>
  )
}
