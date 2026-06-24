'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { ALL_MODULES, ADMIN_ROLE, MODULE_META, type RoleRow } from '@/shared/auth/permissions'
import { apiPost, apiSend } from '@/shared/api'
import Modal from '@/shared/components/Modal'
import ErrorBlock from './ErrorBlock'

// 'admin' NO se reparte: el acceso total es el ROL admin (short-circuit), no un módulo asignable.
const ASIGNABLES = ALL_MODULES.filter(s => s !== ADMIN_ROLE)

export default function RoleModal({ role, onClose }: { role?: RoleRow; onClose: () => void }) {
  const { border, t2, t3, accent, inputStyle, roleModuleMap, reloadRoles } = useApp()
  const [label, setLabel] = useState(role?.label || '')
  const [modules, setModules] = useState<string[]>(role ? (roleModuleMap[role.key] || []) : [])
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function toggle(slug: string) {
    setModules(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  async function guardar() {
    setError(null)
    if (!label.trim()) { setError('Ponle un nombre al rol.'); return }
    setGuardando(true)
    try {
      const { res, result } = role
        ? await apiSend('PATCH', `/api/admin/roles/${role.key}`, { label: label.trim(), modules })
        : await apiPost('/api/admin/roles', { label: label.trim(), modules })
      if (!res.ok) { setError(result.error || 'No se pudo guardar el rol.'); setGuardando(false); return }
      await reloadRoles()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error de red al guardar el rol.')
    }
    setGuardando(false)
  }

  return (
    <Modal title={role ? 'Editar rol' : 'Nuevo rol'} width={480} onClose={onClose}>
      <ErrorBlock msg={error} />
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre del rol</label>
        <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej. Soporte" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Módulos con acceso</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ASIGNABLES.map(slug => {
            const on = modules.includes(slug)
            return (
              <button key={slug} type="button" onClick={() => toggle(slug)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, border: `1px solid ${on ? accent : border}`, background: on ? `${accent}1A` : 'transparent', color: on ? accent : t2, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${on ? accent : border}`, background: on ? accent : 'transparent', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                {MODULE_META[slug].name}
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button onClick={guardar} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? 'Saving...' : role ? 'Save changes' : 'Create role'}</button>
      </div>
    </Modal>
  )
}
