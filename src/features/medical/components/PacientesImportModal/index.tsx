'use client'
import { useCallback, useMemo } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import { ImportModal, type ImportPlan, type SourceWarning } from '@/shared/import'
import { useMedical } from '../MedicalContext'
import {
  PACIENTE_FIELD_DEFS, domainOptions, normalizeDomainValue, guessMapping, ignoredHeaders,
} from '@/features/medical/utils/pacienteFields'
import {
  buildPacienteImportPlan, detectPacienteAnomalies, fuenteDeHoja, indexPorClave,
  pacienteEntranteDe, fuenteEscrituraDe, contactosDe,
  type DupMode, type ValueMap,
} from '@/features/medical/utils/pacienteImportPlan'
import type { Identificable } from '@/features/medical/utils/pacienteIdentity'
import type { FilaEscritura } from '@/features/medical/utils/escribirImport'

// Pegamento entre el mapeador genérico (`@/shared/import`) y el dominio de pacientes: le pasa
// el catálogo de campos, arma el plan por (fuente, clave_origen) + candidatos por similitud
// (`buildPacienteImportPlan`, que hace todo el trabajo de identidad) y traduce el plan ya
// resuelto a `FilaEscritura[]` para `escribirImport` (Tarea 11) — la fusión de VALORES (qué
// campo gana cuando existente y entrante difieren) la hace `escribirImport`, no acá: por eso
// el caso 'existente' de `FilaEscritura` lleva el registro REAL de la base, no el que arma
// este archivo.
// Etiqueta de cada campo que puede llegar a chocar (`CAMPOS_FUSIONABLES` en `escribirImport`),
// para el resumen del paso 6. `fecha_nacimiento`/`genero` son los ÚNICOS choques reales de hoy
// (ver el spec §4); el resto entra igual por si algún día dos fuentes contradicen un dato
// clínico -sin clave conocida, se muestra el nombre crudo del campo en vez de romper.
const CAMPO_LABEL_KEYS: Partial<Record<string, I18nKey>> = {
  nombre: 'med.import.field.nombre',
  apellido: 'med.import.field.apellido',
  fecha_nacimiento: 'med.import.field.fechaNacimiento',
  genero: 'med.import.field.genero',
  seguro: 'med.insurance',
  seguro_id: 'med.insuranceId',
  direccion: 'med.address',
  estado: 'med.status',
  alergias: 'med.allergies',
  condiciones: 'med.conditions',
}

type Props = { onClose: () => void }

export default function PacientesImportModal({ onClose }: Props) {
  const { mostrarMensaje } = useApp()
  const { t } = useT()
  const { pacientes, pacienteFuentes, importarPacientes } = useMedical()

  const pacientesIdentificables = useMemo<Identificable[]>(
    () => pacientes.map(p => ({ id: p.id, nombre: p.nombre, apellido: p.apellido, fecha_nacimiento: p.fecha_nacimiento, telefono: p.telefono, email: p.email })),
    [pacientes],
  )
  const pacientesById = useMemo(() => new Map(pacientes.map(p => [p.id, p])), [pacientes])

  const buildPlan = useCallback(
    (rows: string[][], mapping: (string | null)[], dupMode: DupMode, valueMap: ValueMap, hoja: string | null): ImportPlan => {
      const fuente = hoja ? fuenteDeHoja(hoja) : null
      const existentes = fuente ? indexPorClave(fuente, pacienteFuentes) : new Map<string, string | null>()
      // Paso 5: `plan.toMerge[i].values` viaja SIN tocar -array entero de telefono/email
      // incluido- porque es el MISMO objeto que, si la fila no se fusiona, pasa a `toInsert` y
      // de ahí a `contactosDe` (Tarea 5): resolver acá el principal le costaría el segundo
      // teléfono a las filas que más lo necesitan (las candidatas a fusión). El paso 5 muestra
      // el array como lista y compara por SOLAPE, no por igualdad de texto -ver
      // `MergeCandidateRow.fmt`/`haySolape`, en `@/shared/import`-.
      return buildPacienteImportPlan({ rows, mapping, dupMode, valueMap, fuente, existentes, pacientes: pacientesIdentificables })
    },
    [pacienteFuentes, pacientesIdentificables],
  )

  const detectAnomalies = useCallback(
    (rows: string[][], mapping: (string | null)[], hoja: string | null) => {
      const resultado = detectPacienteAnomalies(hoja ? fuenteDeHoja(hoja) : null, rows, mapping)
      return resultado.estado === 'ok' ? resultado.issues : []
    },
    [],
  )

  // Paso 2b: la misma heurística de `fuenteDeHoja` que ya usan `buildPlan`/`detectAnomalies`,
  // ahora también audible ANTES de calcular nada — `validateSource` es lo único de este archivo
  // que dice el mensaje que el usuario ve; `ImportModal` solo lo renderiza y bloquea el botón.
  const validateSource = useCallback((hoja: string | null): SourceWarning | null => {
    if (!hoja || fuenteDeHoja(hoja)) return null
    return { messageKey: 'med.import.unknownSource', messageParams: { hoja } }
  }, [])

  const resolveCandidate = useCallback((id: string) => {
    const p = pacientesById.get(id)
    if (!p) return undefined
    return {
      label: `${p.mrn} — ${p.nombre} ${p.apellido}`,
      values: { nombre: p.nombre, apellido: p.apellido, fecha_nacimiento: p.fecha_nacimiento, telefono: p.telefono, email: p.email },
    }
  }, [pacientesById])

  const onConfirm = useCallback(async (plan: ImportPlan): Promise<boolean> => {
    const filas: FilaEscritura[] = [
      ...plan.toInsert.map((values): FilaEscritura => ({
        tipo: 'nueva', entrante: pacienteEntranteDe(values), fuente: fuenteEscrituraDe(values), contactos: contactosDe(values),
      })),
      ...plan.toUpdate.map((u): FilaEscritura => ({
        tipo: 'existente', id: u.id, existente: pacientesById.get(u.id) ?? {}, entrante: pacienteEntranteDe(u.values),
        fuente: fuenteEscrituraDe(u.values), contactos: contactosDe(u.values),
      })),
    ]
    const resultado = await importarPacientes(filas)
    if (resultado.error) {
      mostrarMensaje('error', t('med.import.writeError', { lote: resultado.error.lote + 1, error: resultado.error.mensaje }))
      return false
    }
    mostrarMensaje('ok', t('med.import.done', { ins: plan.toInsert.length, upd: plan.toUpdate.length }))
    // Nada se traga en silencio: si la escritura rechazó filas (sin nombre o apellido), se
    // avisa aparte — el resumen del paso 6 ya cubrió lo que se decidió ANTES de escribir.
    if (resultado.rechazadas.length > 0) mostrarMensaje('error', t('med.import.rejected', { n: resultado.rechazadas.length }))
    // Y si algo chocó de verdad (fecha_nacimiento, genero — telefono/email ya no cuentan, son
    // contactos), también: es la regla del spec, "nada se descarta sin aparecer acá".
    if (resultado.choques.length > 0) {
      const resumen = resultado.choques
        .map((c) => {
          const labelKey = CAMPO_LABEL_KEYS[c.campo]
          return t('med.import.choques', { n: c.n, campo: labelKey ? t(labelKey) : c.campo })
        })
        .join(' · ')
      mostrarMensaje('error', resumen)
    }
    return true
  }, [pacientesById, importarPacientes, mostrarMensaje, t])

  return (
    <ImportModal<ImportPlan>
      open
      title={t('med.import.title')}
      accept=".xlsx"
      kind="workbook"
      selectFileLabelKey="med.import.selectFile"
      dupLabelKey="med.import.dupLabel"
      fieldDefs={PACIENTE_FIELD_DEFS}
      domainOptions={domainOptions}
      normalizeDomainValue={normalizeDomainValue}
      guessMapping={guessMapping}
      computeDropped={ignoredHeaders}
      detectAnomalies={detectAnomalies}
      validateSource={validateSource}
      resolveCandidate={resolveCandidate}
      buildPlan={buildPlan}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
