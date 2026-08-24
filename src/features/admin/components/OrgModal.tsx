'use client'
import { useState } from 'react'
import { useApp, COLORES_AVATAR } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { apiPost, apiSend } from '@/shared/utils/api'
import type { OrgRow } from '@/shared/context/loadAppData'
import Modal from '@/shared/components/ui/Modal'
import { ORG_CATALOGS, type OrgCat, type OrgField } from '../org-catalogs'
import ErrorBlock from './ErrorBlock'

// Iconos ofrecidos para departamentos. Lista corta y curada en vez de un emoji
// picker: el admin elige de un set coherente y no queda un campo de texto donde
// hay que pegar el emoji a mano. Click en el activo lo deselecciona.
const ICONOS = ['📣', '🏥', '🔬', '💰', '👥', '💻', '🎨', '📊', '🤝', '⚖️', '📦', '🎓', '🚀', '🛡️']

// Alta/edición de una fila de catálogo. El form se genera desde ORG_CATALOGS:
// no hay un modal por catálogo ni campos duplicados entre ellos.
export default function OrgModal({ cat, row, onClose }: { cat: OrgCat; row?: OrgRow; onClose: () => void }) {
  const { border, t2, t3, accent, inputStyle, departamentos, adminUsuarios, reloadOrg } = useApp()
  const { t } = useT()
  const def = ORG_CATALOGS[cat]
  const [form, setForm] = useState<Partial<OrgRow>>(row ?? { color: COLORES_AVATAR[0], activo: true })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const value = (f: OrgField) => String(form[f.name] ?? '')
  const checked = (f: OrgField) => form[f.name] === true
  const set = (f: OrgField, v: string | boolean) => setForm(p => ({ ...p, [f.name]: v }))

  // Opciones de los select: catálogos ya cargados en el contexto, sin fetch propio.
  const optionsFor = (f: OrgField) =>
    f.options === 'departamentos'
      ? departamentos.map(d => ({ value: d.id, label: d.nombre }))
      : adminUsuarios.filter(u => u.activo).map(u => ({ value: u.id, label: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email || u.id }))

  async function guardar() {
    setError(null)
    const faltante = def.fields.find(f => f.required && !String(form[f.name] ?? '').trim())
    if (faltante) { setError(t('admin.org.required', { campo: t(faltante.labelKey) })); return }
    setGuardando(true)
    try {
      const { res, result } = row
        ? await apiSend<{ error?: string }>('PATCH', `/api/admin/org/${cat}/${row.id}`, form)
        : await apiPost<{ error?: string }>(`/api/admin/org/${cat}`, form)
      if (!res.ok) { setError(result.error || t('admin.org.saveFailed')); setGuardando(false); return }
      await reloadOrg()
      onClose()
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : '') || t('admin.org.saveNetErr'))
    }
    setGuardando(false)
  }

  return (
    <Modal title={t(row ? 'admin.org.editTitle' : 'admin.org.newTitle', { tipo: t(def.labelKey) })} width={460} onClose={onClose}>
      <ErrorBlock msg={error} />
      {def.fields.map(f => {
        // `recibe_actividades` solo tiene sentido sobre una empresa activa: si el
        // interruptor maestro está apagado, este queda deshabilitado para que el
        // estado contradictorio no se pueda armar desde la UI.
        //
        // Es la única regla del renderer que nombra un campo concreto. El hint sí
        // se declara en ORG_CATALOGS (`hintKey`) porque cualquier campo puede
        // querer uno; esta condición no se declaró porque haría falta una función
        // en la config —que dejaría de ser datos— para un solo caso. Si aparece un
        // segundo campo con deshabilitado condicional, ahí se abstrae.
        const off = f.name === 'recibe_actividades' && form.activo === false
        return (
          <div key={f.name} style={{ marginBottom: 14 }}>
            {f.type !== 'checkbox' && (
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t(f.labelKey)}{f.required ? ' *' : ''}</label>
            )}
            {f.type === 'checkbox' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.5 : 1 }}>
                <input type="checkbox" checked={checked(f)} disabled={off}
                  onChange={e => set(f, e.target.checked)} style={{ cursor: off ? 'not-allowed' : 'pointer' }} />
                <span style={{ fontSize: 12, color: t2, whiteSpace: 'nowrap' }}>{t(f.labelKey)}</span>
                {f.hintKey && <span style={{ fontSize: 10, color: t3 }}>{t(f.hintKey)}</span>}
              </label>
            ) : f.type === 'select' ? (
              <select value={value(f)} onChange={e => set(f, e.target.value)} style={inputStyle}>
                {!f.required && <option value="">{t('admin.org.none')}</option>}
                {optionsFor(f).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'number' ? (
              <input type="number" min={0} max={24} step={0.5} value={value(f)} onChange={e => set(f, e.target.value)} style={inputStyle} />
            ) : f.type === 'icon' ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {ICONOS.map(ic => {
                  const on = value(f) === ic
                  return (
                    <button key={ic} type="button" onClick={() => set(f, on ? '' : ic)}
                      style={{ width: 32, height: 32, fontSize: 16, lineHeight: 1, borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? accent : border}`, background: on ? `${accent}1A` : 'transparent' }}>
                      {ic}
                    </button>
                  )
                })}
                {/* Escape hatch: cualquier emoji fuera del set curado. */}
                <input type="text" value={value(f)} onChange={e => set(f, e.target.value)} maxLength={4}
                  placeholder="…" title={t('admin.org.iconoLibre')}
                  style={{ ...inputStyle, width: 46, textAlign: 'center', padding: '6px 0' }} />
              </div>
            ) : f.type === 'color' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES_AVATAR.map(c => (
                  <div key={c} onClick={() => set(f, c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: value(f) === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
              </div>
            ) : (
              <input type="text" value={value(f)} onChange={e => set(f, e.target.value)} style={inputStyle} />
            )}
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
        <button onClick={guardar} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? t('common.saving') : t('common.save')}</button>
      </div>
    </Modal>
  )
}
