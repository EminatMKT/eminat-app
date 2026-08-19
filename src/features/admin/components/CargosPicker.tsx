'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'

// Multiselección de cargos (N:N vía usuario_cargos). Reemplaza el viejo campo
// free-text `usuarios.cargo`: la lista sale del catálogo, no se escribe a mano.
export default function CargosPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { cargos, border, t2, t3, accent } = useApp()
  const { t } = useT()
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('admin.cargosTitle')}</label>
      {cargos.length === 0
        ? <div style={{ fontSize: 11, color: t3 }}>{t('admin.org.empty')}</div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {cargos.map(c => {
              const on = value.includes(c.id)
              return (
                <button key={c.id} type="button" onClick={() => toggle(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, border: `1px solid ${on ? accent : border}`, background: on ? `${accent}1A` : 'transparent', color: on ? accent : t2, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${on ? accent : border}`, background: on ? accent : 'transparent', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                  {c.nombre}
                </button>
              )
            })}
          </div>}
      <div style={{ fontSize: 10, color: t3, marginTop: 6 }}>{t('admin.cargosHint')}</div>
    </div>
  )
}
