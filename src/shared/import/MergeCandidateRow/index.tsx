import { useId, type CSSProperties } from 'react'
import { useT, type I18nKey } from '@/shared/i18n'
import type { NivelCandidato } from '../identity'
import MergeFieldRow from '../MergeFieldRow'
import s from './index.module.css'

// Una fila del paso "Duplicados" (paso 5): la fila entrante del archivo, enfrentada a uno o
// más pacientes/registros ya existentes que podrían ser la misma persona. 100% genérico —
// no sabe qué es un paciente ni un lead: los campos a comparar entran por `fields` (el mismo
// `ImportFieldDef[]` del mapeo) y los valores por `entrante`/`candidatos[].values`, ya
// coercidos por el módulo que arma el plan.
//
// Con un solo candidato (el caso típico) la decisión es un checkbox: "fusionar con este" o no.
// Con más de uno se vuelve un grupo de radios, con una opción explícita "Ninguno" — un radio no
// se puede destildar solo, así que sin esa opción no habría forma de volver atrás.
export type MergeCandidateDisplay = { id: string; nivel: NivelCandidato; label: string; values: Record<string, unknown> }

type Props = {
  fields: { column: string; labelKey: I18nKey }[]
  entrante: Record<string, unknown>
  candidatos: MergeCandidateDisplay[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

export default function MergeCandidateRow({ fields, entrante, candidatos, selectedId, onSelect }: Props) {
  const { t } = useT()
  const groupName = useId()
  const nivel: NivelCandidato = candidatos.some(c => c.nivel === 'exacta') ? 'exacta' : 'parcial'
  const columnas = [t('import.merge.incoming'), ...candidatos.map(c => c.label)]

  return (
    <div className={nivel === 'exacta' ? `${s.card} ${s.exacta}` : `${s.card} ${s.parcial}`}>
      <div className={s.head}>
        <span className={nivel === 'exacta' ? `${s.badge} ${s.badgeExacta}` : `${s.badge} ${s.badgeParcial}`}>
          {t(nivel === 'exacta' ? 'import.merge.levelExact' : 'import.merge.levelPartial')}
        </span>
        {candidatos.length === 1 ? (
          <label className={s.toggle}>
            <input type="checkbox" checked={selectedId === candidatos[0].id}
              onChange={e => onSelect(e.target.checked ? candidatos[0].id : null)} />
            {t('import.merge.mergeWith')}
          </label>
        ) : (
          <div className={s.radios}>
            {candidatos.map(c => (
              <label key={c.id} className={s.toggle}>
                <input type="radio" name={groupName} checked={selectedId === c.id} onChange={() => onSelect(c.id)} />
                {c.label}
              </label>
            ))}
            <label className={s.toggle}>
              <input type="radio" name={groupName} checked={selectedId === null} onChange={() => onSelect(null)} />
              {t('import.merge.none')}
            </label>
          </div>
        )}
      </div>

      <div className={s.grid} style={{ '--cols': columnas.length + 1 } as CSSProperties}>
        <div className={s.colHead} />
        {columnas.map(c => <div key={c} className={s.colHead}>{c}</div>)}
        {fields.map(f => {
          const entranteVal = fmt(entrante[f.column])
          const valores = [entranteVal, ...candidatos.map(c => fmt(c.values[f.column]))]
          const distinta = candidatos.some(c => fmt(c.values[f.column]) !== entranteVal && fmt(c.values[f.column]) !== '—' && entranteVal !== '—')
          return <MergeFieldRow key={f.column} labelKey={f.labelKey} values={valores} diff={distinta} />
        })}
      </div>
    </div>
  )
}
