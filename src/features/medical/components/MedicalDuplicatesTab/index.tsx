'use client'
import { useT } from '@/shared/i18n'
import DuplicatesTab from '@/shared/dedup/DuplicatesTab'
import comparePacientes from './comparePacientes'
import loadPaciente from './loadPaciente'
import loadSummaries from './loadSummaries'
import buildReviewMergeValues from './buildReviewMergeValues'
import summarizePaciente from './summarizePaciente'
import renderPreview from './renderPreview'

/** Medical's wrapper over the shared duplicate-review screen: loads a patient with its contact
 *  rows, names it `nombre apellido`, and compares clinical conflicts plus every phone and email. */
export default function MedicalDuplicatesTab() {
  const { t } = useT()
  return (
    <DuplicatesTab
      entidad="pacientes"
      cargarItem={loadPaciente}
      loadSummaries={loadSummaries}
      renderResumen={({ paciente }) => summarizePaciente(paciente)}
      renderComparacion={(a, b, controls) => comparePacientes(a, b, controls, t)}
      construirValoresFinales={buildReviewMergeValues}
      renderPreview={(a, b, valoresFinales, controls) => renderPreview(a, b, valoresFinales, controls, t)}
    />
  )
}

// Wires Medical's patient shape into the shared `DuplicatesTab` contract. Contacts travel to the
// RPC as excluded ids, and `buildReviewMergeValues` keeps those exclusions out of the main columns.
