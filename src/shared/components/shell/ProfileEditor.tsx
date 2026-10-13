'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import Modal from '@/shared/components/ui/Modal'
import AvatarArt, { AVATARS, type AvatarKey } from '@/shared/components/AvatarArt'
import s from './profile.module.css'

export default function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { usuario, setUsuario, setUsuarios, empresas, roles } = useApp()
  const [selected, setSelected] = useState<AvatarKey | null>((usuario?.avatar_key as AvatarKey) || null)
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const company = empresas.find(item => item.id === usuario?.empresa_id)?.nombre
  const role = roles.find(item => item.key === usuario?.rol)?.label || usuario?.rol

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('No se pudo cargar el perfil')
        return response.json() as Promise<{ profile: { fecha_nacimiento: string | null } }>
      })
      .then(data => setBirthDate(data.profile.fecha_nacimiento))
      .catch(() => setError('La fecha de nacimiento no está disponible por ahora.'))
  }, [])

  async function save() {
    if (!selected || !usuario) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_key: selected }),
      })
      if (!response.ok) throw new Error('No se pudo guardar el avatar')
      setUsuario(prev => prev ? { ...prev, avatar_key: selected } : prev)
      setUsuarios(prev => prev.map(item => item.id === usuario.id ? { ...item, avatar_key: selected } : item))
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el avatar')
    } finally { setSaving(false) }
  }

  return <Modal title="Editar perfil" subtitle="Elige tu avatar" anchoRem={42} onClose={onClose}
    footer={<div className={s.footer}>
      <button type="button" className={s.cancel} onClick={onClose}>Cerrar</button>
      <button type="button" className={s.save} onClick={save} disabled={!selected || saving || selected === usuario?.avatar_key}>{saving ? 'Guardando…' : 'Guardar avatar'}</button>
    </div>}>
    <div className={s.summary}>
      <div className={s.preview}>{selected ? <AvatarArt avatarKey={selected} size={88} /> : <span>{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</span>}</div>
      <div><h2>{usuario?.nombre} {usuario?.apellido}</h2><p>{role}{company ? ` · ${company}` : ''}</p><p>{usuario?.email}</p></div>
    </div>
    <h3 className={s.sectionTitle}>Selecciona tu avatar</h3>
    <div className={s.gallery} role="radiogroup" aria-label="Avatares">
      {AVATARS.map(avatar => <button type="button" key={avatar.key} role="radio" aria-checked={selected === avatar.key}
        className={`${s.avatarChoice} ${selected === avatar.key ? s.selected : ''}`}
        onClick={() => { setSelected(avatar.key); setSaved(false) }}>
        <AvatarArt avatarKey={avatar.key} size={82} /><span>{avatar.label}</span>
      </button>)}
    </div>
    <div className={s.privateField}><strong>Cumpleaños</strong><span>{birthDate || 'No registrado'}</span><small>Este dato lo administra el equipo autorizado.</small></div>
    {error && <p className={s.error} role="alert">{error}</p>}
    {saved && <p className={s.success} role="status">Avatar actualizado. Ya aparece en tu perfil y en Directory.</p>}
  </Modal>
}
