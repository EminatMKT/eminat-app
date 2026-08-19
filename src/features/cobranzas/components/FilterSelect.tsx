'use client'
import { useApp } from '@/shared/context/AppContext'

// Select de filtro con el estilo compacto compartido. Las <option> van como children.
export default function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const { inputStyle } = useApp()
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12 }}>
      {children}
    </select>
  )
}
