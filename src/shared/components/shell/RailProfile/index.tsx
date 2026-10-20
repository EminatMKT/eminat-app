'use client'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import AvatarArt from '@/shared/components/AvatarArt'
import ProfileEditor from '@/shared/components/shell/ProfileEditor'
import s from '@/shared/components/shell/profile.module.css'

export default function RailProfile() {
  const { usuario, cargo, handleLogout, roles, accent } = useApp()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const role = roles.find(item => item.key === usuario?.rol)?.label || usuario?.rol
  const fullName = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ')

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  return <>
    <div ref={root} className={s.railAnchor} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
      <button className={s.avatarButton} type="button" aria-label={`Perfil de ${fullName || 'usuario'}`}
        aria-expanded={open} aria-controls="rail-profile-options" onClick={() => setOpen(true)} onFocus={() => setOpen(true)}>
        {usuario?.avatar_key ? <AvatarArt avatarKey={usuario.avatar_key} size={38} />
          : <span className={s.initials} style={{ background: usuario?.color || accent }}>{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</span>}
        <span className={s.onlineDot} aria-hidden="true" />
      </button>
      {usuario?.nombre && <span className={s.railShortName} title={fullName}>{usuario.nombre}</span>}
      {open && <div id="rail-profile-options" className={s.railPopover} role="group" aria-label="Opciones del perfil">
        <strong className={s.railName}>{fullName || 'Mi perfil'}</strong>
        {role && <span className={s.railRole}>{role}</span>}
        {cargo && <span className={s.railCargo}>{cargo}</span>}
        <span className={s.railLocation}>📍 {usuario?.ubicacion || 'Ubicación no disponible'}</span>
        <button className={s.railAction} type="button" onClick={() => { setOpen(false); setEditing(true) }}>Editar perfil</button>
        <button className={s.railSignout} type="button" onClick={handleLogout}>Cerrar sesión</button>
      </div>}
    </div>
    {editing && <ProfileEditor onClose={() => setEditing(false)} />}
  </>
}
