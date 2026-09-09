'use client'
import { countByOption } from '@/shared/utils'
import { useT } from '@/shared/i18n'
import { PillToggle } from '@/shared/components/ui'
import type { ControlProps } from '../types'

// centinela-exime: familia-dispersa@2 — los tres controles del motor ya viven juntos acá. El
// único `*Filter` afuera es `tasks/report-filter.ts`, que no es un control sino el predicado del
// generador de reportes, y está planeado reemplazarlo por este mismo motor.

type Props<T> = ControlProps<T> & {
  /** Cada opción lleva cuántos items caen en ella. Lo decide el punto de uso: en el Directorio
   *  «cuántos hay en Medical» es media respuesta, y en un filtro de fechas relativas —hoy,
   *  mañana— el número cambia solo y no dice nada. */
  withCount?: boolean
}

/** Las píldoras de un filtro de selección única, sin contenedor: lo pone quien las monta. */
export default function ChipFilter<T>(props: Props<T>) {
  const { def, items, value, onChange, withCount = false } = props
  const { t } = useT()
  const counts = withCount ? countByOption(items, def) : null
  const options = def.options?.(items) ?? []
  // La huérfana: el valor elegido dejó de estar entre las opciones —se filtró por un rol y el
  // último que lo tenía cambió—. Sin su píldora el filtro SIGUE aplicando sin un control que lo
  // diga: lista vacía y ninguna forma de volver. Es el mismo caso que `SelectFilter`.
  const chips = value && !options.includes(value) ? [...options, value] : options
  return (
    <>
      {/* La de «todos» no lleva cuenta: contaría el total, que ya está en el título. */}
      <PillToggle size="sm" label={t(def.labelKey)} active={!value} onClick={() => onChange('')} />
      {chips.map(o => (
        <PillToggle key={o} size="sm" label={def.optionLabel?.(o) ?? o} count={counts?.[o] ?? undefined}
          active={value === o} onClick={() => onChange(o)} />
      ))}
    </>
  )
}

// El tercer control del motor de filtros, junto a `SelectFilter` e `InputFilter`. Contesta la
// misma pregunta que el `<select>` y admite la misma respuesta; lo distinto es cuándo conviene:
// píldoras cuando las opciones son pocas y vale verlas todas de un vistazo.
//
// No dibuja el botón —ése ya existía como `PillToggle`, al que sólo le faltaba el número— ni la
// fila que los alinea: los tres lugares que lo montan la quieren distinta (Admin la scrollea con
// su desvanecido, Directorio la envuelve, Medical la deja corrida), y ésa es la parte que de
// verdad les pertenece. Lo que agrega es el cableado a un `FilterDef`: las opciones, el rótulo de
// cada una y la cuenta — justo lo que `RoleChip`, `DateFilterChip` y `DepartmentChip` tenían cada
// uno a mano, con tres radios y tres opacidades de acento distintas.
//
// La píldora vacía va primero y su valor es la cadena vacía: el mismo «sin filtro» que el
// placeholder de un `<select>`, así que el motor no distingue entre las dos formas.
