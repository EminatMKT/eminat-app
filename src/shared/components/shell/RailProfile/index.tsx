'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import AvatarArt from '@/shared/components/AvatarArt'
import ProfileEditor from '@/shared/components/shell/ProfileEditor'
import s from '@/shared/components/shell/profile.module.css'

export default function RailProfile() {
  const { usuario, handleLogout, roles, accent } = useApp()
  const [editing, setEditing] = useState(false)
  const role = roles.find(item => item.key === usuario?.rol)?.label || usuario?.rol
  return <>
    <div className={s.card}>
      {usuario?.avatar_key ? <AvatarArt avatarKey={usuario.avatar_key} size={52} /> : <div style={{ width: 52, height: 52, borderRadius: 13, background: usuario?.color || accent, display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700 }}>{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</div>}
      <span className={s.name} title={`${usuario?.nombre || ''} ${usuario?.apellido || ''}`}>{usuario?.nombre} {usuario?.apellido}</span>
      <span className={s.role} title={role}>{role}</span>
      <button className={s.edit} type="button" onClick={() => setEditing(true)}>Editar perfil</button>
      <button className={s.signout} type="button" onClick={handleLogout}>Cerrar sesión</button>
    </div>
    {editing && <ProfileEditor onClose={() => setEditing(false)} />}
  </>
}
