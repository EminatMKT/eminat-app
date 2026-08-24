'use client'
import { useCallback, useMemo, useState } from 'react'
import { useT } from '@/shared/i18n'
import { ImportModal, type ImportPlan } from '@/shared/import'
import { useResearch } from '@/features/research/components/ResearchContext'
import { LEAD_FIELD_DEFS, domainOptions, normalizeDomainValue } from '@/features/research/utils/fields'
import {
  guessMapping, indexByNct, buildImportPlan as buildResearchPlan, planCounterChanges,
  stripCounterFor, ignoredHeaders, type DupMode, type ValueMap,
} from '@/features/research/utils/importPlan'
import CounterChangeRow from '../CounterChangeRow'
import s from './index.module.css'

// Pegamento entre el mapeador genérico (`@/shared/import`, compartido con Medical algún día)
// y el dominio de Research: le pasa el catálogo de campos de un lead, arma el plan por NCT#
// (`indexByNct` + `buildImportPlan`) y agrega la sección que el genérico no puede tener —
// el contador (`email_count`) tiene DOS escritores (el pop-up y este import), así que antes
// de pisar hay que mostrar qué cambia y dejar destildarlo lead por lead. Eso vive acá, no en
// `ImportModal`: Medical no tiene nada parecido.
export default function LeadImportModal() {
  const { t } = useT()
  const { modalImport, setModalImport, confirmImport, leads } = useResearch()
  // Leads cuyo contador el usuario decidió NO pisar (destildados en el preview). El plan que
  // se ejecuta es el filtrado por `transformPlan`, no el que arma `buildPlan`.
  const [keepCount, setKeepCount] = useState<Set<string>>(new Set())

  const existingByNct = useMemo(() => indexByNct(leads), [leads])
  const countById = useMemo(() => new Map(leads.map(l => [l.id, l.email_count ?? null])), [leads])

  // El 5º parámetro (`hoja`) es del modo 'workbook' (Medical, que trabaja con .xlsx de varias
  // hojas) — Research importa CSV de una sola tabla, así que siempre llega `null`.
  const buildPlan = useCallback(
    (rows: string[][], mapping: (string | null)[], dupMode: DupMode, valueMap: ValueMap): ImportPlan =>
      buildResearchPlan({ rows, mapping, existingByNct, dupMode, valueMap }),
    [existingByNct],
  )

  const transformPlan = useCallback((plan: ImportPlan) => stripCounterFor(plan, keepCount), [keepCount])

  const renderExtra = useCallback((plan: ImportPlan) => {
    const counterChanges = planCounterChanges(plan, countById)
    if (!counterChanges.length) return null
    return (
      <>
        <div className={s.sectionTitle}>{t('research.import.counterSection')}</div>
        <div className={s.warnText}>{t('research.import.counterWarning', { n: counterChanges.length })}</div>
        <div className={s.counterList}>
          {counterChanges.map(c => (
            <CounterChangeRow key={c.id} change={c} apply={!keepCount.has(c.id)}
              onToggle={() => setKeepCount(prev => {
                const next = new Set(prev)
                next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                return next
              })} />
          ))}
        </div>
      </>
    )
  }, [countById, keepCount, t])

  return (
    <ImportModal<ImportPlan>
      open={modalImport}
      title={t('research.import.title')}
      accept=".csv,.tsv,.txt"
      kind="delimited"
      fieldDefs={LEAD_FIELD_DEFS}
      domainOptions={domainOptions}
      normalizeDomainValue={normalizeDomainValue}
      guessMapping={guessMapping}
      computeDropped={ignoredHeaders}
      buildPlan={buildPlan}
      renderExtra={renderExtra}
      transformPlan={transformPlan}
      onConfirm={confirmImport}
      onClose={() => { setModalImport(false); setKeepCount(new Set()) }}
    />
  )
}
