'use client'
import { useT } from '@/shared/i18n'
import type { FilterDef } from '@/shared/utils'
import { Dropdown } from '@/shared/components/ui'
import FilterPickerItem from './FilterPickerItem'

// centinela-exime: familia-dispersa@2 — los otros `*Picker` del repo eligen una FILA de un
// catálogo (un cargo, una hoja, un solicitante); éste elige qué filtros se ven. Misma palabra,
// otra pregunta: unificarlos daría el componente de quince props que la regla vecina prohíbe.

type Props<T> = {
  defs: FilterDef<T>[]
  ocultos: string[]
  onAlternar: (key: string) => void
  labelFor: (def: FilterDef<T>) => string
}

// Qué filtros se muestran: un checkbox por def, adentro del desplegable compartido.
//
// El disparador va punteado —el `punteado` de `Dropdown`— y no sólido como el de las vistas: es
// la única señal de que «+ Filtro» no filtra por sí mismo, sino que ofrece cuáles se ven.
export default function FilterPicker<T>({ defs, ocultos, onAlternar, labelFor }: Props<T>) {
  const { t } = useT()
  return (
    <Dropdown rotulo={t('common.filter.pick')} punteado>
      {defs.map(d => (
        <FilterPickerItem key={d.key} label={labelFor(d)} visible={!ocultos.includes(d.key)}
          onAlternar={() => onAlternar(d.key)} />
      ))}
    </Dropdown>
  )
}
