'use client'
import { useMedicalStyles } from '../hooks/useMedicalStyles'

export default function CitaActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  const { btnSecondary } = useMedicalStyles()
  return (
    <button onClick={onClick} style={{ ...btnSecondary, fontSize: 9, padding: '3px 8px', color, borderColor: `${color}40` }}>{label}</button>
  )
}
