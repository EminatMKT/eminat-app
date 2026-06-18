'use client'
import { useApp } from '@/shared/context/AppContext'
import { generateTempPassword, copyToClipboard } from '../password'

type Props = {
  value: string
  onChange: (v: string) => void
  show: boolean
  setShow: (v: boolean) => void
}

export default function PasswordInput({ value, onChange, show, setShow }: Props) {
  const { inputStyle, mostrarMensaje } = useApp()
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 92, fontFamily: 'DM Mono, monospace' }}
        placeholder="Min. 8 caracteres"
      />
      <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
        <button type="button" onClick={() => setShow(!show)} title={show ? 'Ocultar' : 'Mostrar'} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>{show ? '🙈' : '👁'}</button>
        <button type="button" onClick={async () => { if (await copyToClipboard(value)) mostrarMensaje('ok', 'Contraseña copiada') }} title="Copiar" style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>📋</button>
        <button type="button" onClick={() => { onChange(generateTempPassword()); setShow(true) }} title="Generar nueva" style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>🎲</button>
      </div>
    </div>
  )
}
