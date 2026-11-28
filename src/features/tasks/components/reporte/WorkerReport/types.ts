import type { I18nKey } from '@/shared/i18n'

/** A row from the worker's self-scoped report endpoint — no hours, no payment, no `descripcion`
 * (matches `workerColumns` in `src/app/api/tasks/report/route.ts`; add it there too if wanted —
 * `reportHtml` already renders it when present). */
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
