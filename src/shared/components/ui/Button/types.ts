import type { I18nKey } from '@/shared/i18n'

// La unión discriminada es el punto de todo esto: con `variant: string` un typo devuelve un
// botón sin estilo y nada falla; con `ButtonKind`, `kind="nwe"` no compila.
export type ButtonKind = 'new' | 'edit' | 'delete' | 'cancel' | 'confirm' | 'print'

// `primario` y `peligro` son rellenos con texto blanco; `secundario` es contorno. El tono NO es
// un prop: se DERIVA del `kind`, porque un botón de borrar en tono primario sería una mentira
// sobre lo que hace.
export type ButtonTono = 'primario' | 'secundario' | 'peligro'

export type ButtonMeta = { icono: string; labelKey: I18nKey; tono: ButtonTono }
