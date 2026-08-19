'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { copyToClipboard } from '../password'

// Botón de copiar con feedback inline (📋 → ✓ "Copiado" ~1.5s). El feedback es
// imprescindible dentro de modales: el toast global (Topbar) queda tapado por el
// overlay. variant 'icon' = solo el ícono; 'button' = ícono + texto (pill).
type Props = { value: string; variant?: 'icon' | 'button'; style?: React.CSSProperties }

export default function CopyButton({ value, variant = 'icon', style }: Props) {
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  const [copied, setCopied] = useState(false)

  async function onClick() {
    if (!(await copyToClipboard(value))) return
    mostrarMensaje('ok', t('admin.pwdCopied'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const label = copied ? t('common.copied') : t('common.copy')
  return (
    <button type="button" onClick={onClick} title={label}
      style={{ ...style, color: copied ? '#16a34a' : style?.color, cursor: 'pointer' }}>
      {copied ? '✓' : '📋'}{variant === 'button' ? ` ${label}` : ''}
    </button>
  )
}
