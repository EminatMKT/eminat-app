import type { I18nKey } from '@/shared/i18n'
import type { FilterDef } from '@/shared/utils'
import { formatDate, addDays } from '@/features/medical/dates'
import type { Cita } from '@/features/medical/types'

const dayFrom = (n: number) => formatDate(addDays(new Date(), n))

// Cada tramo trae su predicado: con un `if` por tramo afuera, agregar «este mes» eran dos
// ediciones en dos lugares. «Todas» es la cadena vacía, como en el resto del motor.
const RANGES: { value: string; labelKey: I18nKey; match: (c: Cita) => boolean }[] = [
  { value: 'hoy', labelKey: 'med.filterToday', match: ({ fecha }) => fecha === dayFrom(0) },
  { value: 'manana', labelKey: 'med.filterTomorrow', match: ({ fecha }) => fecha === dayFrom(1) },
  { value: 'semana', labelKey: 'med.filterWeek', match: ({ fecha }) => fecha >= dayFrom(0) && fecha <= dayFrom(7) },
]

const rangeOf = (value: string) => RANGES.find(r => r.value === value)

/** El filtro de la agenda. Es una FUNCIÓN porque cada tramo se rotula traducido, y porque «hoy»
 *  se calcula al mirar: congelado al cargar el módulo, la pestaña que quedó abierta desde ayer
 *  seguiría mostrando las citas de ayer. */
const appointmentFilters = (t: (k: I18nKey) => string): FilterDef<Cita>[] => [
  { key: 'fecha', labelKey: 'common.all', nameKey: 'med.colDate', kind: 'chips',
    defaultValue: RANGES[0].value,
    options: () => RANGES.map(r => r.value),
    optionLabel: v => t(rangeOf(v)?.labelKey ?? 'common.all'),
    match: (c, v) => rangeOf(v)?.match(c) ?? true },
]

export default appointmentFilters
