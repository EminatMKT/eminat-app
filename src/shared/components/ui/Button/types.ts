import type { I18nKey } from '@/shared/i18n'

/** The closed action catalog rejects misspelled kinds instead of rendering unstyled controls. */
export type ButtonKind = 'new' | 'edit' | 'delete' | 'cancel' | 'confirm' | 'print' | 'clear' | 'star' | 'retry' | 'menu' | 'duplicate'

/** Tone belongs to the action metadata, not to callers that could disguise a destructive action. */
export type ButtonTono = 'primario' | 'secundario' | 'peligro'

/** One catalog entry keeps translated labels and icons shared by buttons and menus. */
export type ButtonMeta = { icono: string; labelKey: I18nKey; tono: ButtonTono }

/** Callers own operation state and may explain the condition preventing an action. */
export type ButtonProps = {
  kind: ButtonKind
  onClick: () => void
  label?: string
  ocupado?: boolean
  ocupadoLabel?: string
  deshabilitado?: boolean
  iconOnly?: boolean
  pressed?: boolean
  stopPropagation?: boolean
  disabledReason?: string
}
