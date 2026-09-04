import type { Deps } from './tipos'

// Una fecha `YYYY-MM-DD` se lee en hora LOCAL (el 'T00:00:00'): sin eso, `new Date('2026-07-30')`
// es medianoche UTC y en UTC-4 se muestra el día anterior (ver rules/codigo.md). Los timestamps
// completos ya traen su zona, así que van tal cual.
export function fechaLarga(v: string | undefined, locale: string, t: Deps['t']): string {
  if (!v) return t('stratix.detail.noDate')
  const d = new Date(v.length === 10 ? v + 'T00:00:00' : v)
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}
