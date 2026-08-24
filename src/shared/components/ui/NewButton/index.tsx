'use client'
import { useApp } from '@/shared/context/AppContext'

// Botón de alta de las vistas de administración (usuarios, roles, catálogos).
// El "+" lo pone el componente: vivía duplicado dentro de las claves i18n
// ("+ Nuevo usuario") y faltaba en otras, así que el símbolo se desincronizaba
// entre pantallas. Las claves ahora traen solo el texto.
export default function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { accent } = useApp()
  return (
    <button onClick={onClick}
      style={{ padding: '7px 16px', borderRadius: 10, background: accent, color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
      + {label}
    </button>
  )
}
