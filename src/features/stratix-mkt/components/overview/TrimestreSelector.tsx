'use client'
import { useApp, TRIMESTRES } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'

export default function TrimestreSelector() {
  const { accent, border, t2 } = useApp()
  const { trimestre, setTrimestre } = useStratix()
  return (
    <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
      {TRIMESTRES.map(q => (
        <button key={q} onClick={() => setTrimestre(q)} style={{ padding: '5px 16px', borderRadius: 20, border: `1px solid ${trimestre === q ? accent : border}`, background: trimestre === q ? accent : 'transparent', color: trimestre === q ? 'white' : t2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{q}</button>
      ))}
    </div>
  )
}
