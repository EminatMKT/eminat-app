'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { generateTempPassword, copyToClipboard } from '../password'

type Props = {
  value: string
  onChange: (v: string) => void
  show: boolean
  setShow: (v: boolean) => void
}

export default function PasswordInput({ value, onChange, show, setShow }: Props) {
  const { inputStyle, mostrarMensaje } = useApp()
  const { t } = useT()
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 92, fontFamily: 'DM Mono, monospace' }}
        placeholder={t('admin.pwdMinPlaceholder')}
      />
      <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
        <button type="button" onClick={() => setShow(!show)} title={show ? t('common.hide') : t('common.show')} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>{show ? '🙈' : '👁'}</button>
        <button type="button" onClick={async () => { if (await copyToClipboard(value)) mostrarMensaje('ok', t('admin.pwdCopied')) }} title={t('common.copy')} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>📋</button>
        <button type="button" onClick={() => { onChange(generateTempPassword()); setShow(true) }} title={t('admin.generateNew')} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>🎲</button>
      </div>
    </div>
  )
}
