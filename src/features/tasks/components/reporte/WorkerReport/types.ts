import type { I18nKey } from '@/shared/i18n'

/**
 * A row from the worker's self-scoped report endpoint — no hours, no payment data. No
 * description field: deliberate, matches `workerColumns` in `src/app/api/tasks/report/route.ts`
 * today. Adding one here (and to that column list) is the easy path if ever wanted —
 * `reportHtml` already renders a description when present, no template change needed.
 */
export type Row = {
  id: string
  titulo: string
  empresa: string
  estado: string
  fecha_inicio: string
  fecha_entrega: string | null
}

/** The signed-in worker, as the printable sheet needs to know them. */
export type PrintAuthor = { id: string; nombre: string }

/** The period and language the printable sheet renders with. */
export type PrintContext = { mes: string; intlLocale: string; t: (k: I18nKey) => string }
