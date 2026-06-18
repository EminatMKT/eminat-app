'use client'
import { useApp } from '@/shared/context/AppContext'
import { copyToClipboard } from '../password'

type Props = {
  label: string
  name: string
  email: string | null
  pwd: string
  onClose: () => void
  extra?: { cargo?: string; emailWarning?: string | null }
}

// Panel "compartí esta contraseña", reusado por Create-success y Reset-success.
export default function CredentialsPanel({ label, name, email, pwd, onClose, extra }: Props) {
  const { s2, border, t1, t2, t3, accent, mostrarMensaje } = useApp()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(52,211,153,.10)', border: '1px solid rgba(52,211,153,.35)', borderRadius: 12 }}>
        <div style={{ fontSize: 20 }}>✓</div>
        <div style={{ fontSize: 13, color: t1, fontWeight: 600 }}>{label}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 5 }}>Usuario</div>
        <div style={{ fontSize: 14, color: t1, fontWeight: 600 }}>{name}</div>
        {extra?.cargo && <div style={{ fontSize: 11, color: t2, marginTop: 2 }}>{extra.cargo}</div>}
        {email && <div style={{ fontSize: 11, color: t3, fontFamily: 'DM Mono', marginTop: 2 }}>{email}</div>}
      </div>
      <div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 5 }}>Contraseña</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: s2, border: `1px solid ${border}`, fontFamily: 'DM Mono, monospace', fontSize: 15, color: t1, letterSpacing: '.04em', userSelect: 'all' }}>{pwd}</code>
          <button onClick={async () => { if (await copyToClipboard(pwd)) mostrarMensaje('ok', 'Contraseña copiada') }} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 Copiar</button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: t2, lineHeight: 1.5, padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.25)' }}>
        Entrégasela al usuario en un canal privado. La cambiará en su primer inicio de sesión.
      </div>
      {extra?.emailWarning && (
        <div style={{ fontSize: 12, color: '#FBB040', lineHeight: 1.5, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,176,64,.08)', border: '1px solid rgba(251,176,64,.35)' }}>
          ⚠ {extra.emailWarning} Comparte la contraseña manualmente.
        </div>
      )}
      <button onClick={onClose} style={{ padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Listo</button>
    </div>
  )
}
