import type { I18nKey } from '@/shared/i18n'

export type Deps = {
  t: (k: I18nKey, p?: Record<string, string | number>) => string
  locale: string
  miembrosPorId: Record<string, string>
}

export type DetalleCampo = { label: string; value: string; vacio: boolean }
export type GrupoCampos = { titulo: string; campos: DetalleCampo[] }

// Un campo sin dato existe igual —que la semana esté vacía ES información— pero no compite:
// se marca `vacio` y la ficha lo atenúa en vez de darle el mismo peso que a un valor real.
export const campo = (label: string, value: string, vacio = false): DetalleCampo => ({ label, value, vacio })
