// Escritura por lotes del plan de import de pacientes. No decide identidad ni matcheo -eso es
// `pacienteIdentity/` y `@/shared/import`-, solo escribe lo que ya se decidió: en lotes de
// ~500, `pacientes` antes que `paciente_fuentes`, con el id que generó el cliente. Ver
// "## Escritura" en docs/superpowers/specs/2026-08-21-pacientes-import-design.md.
import { upsertPacientes, upsertPacienteFuentes } from '@/features/medical/data/pacientes'
import { fusionar } from '@/features/medical/utils/pacienteIdentity'
import type { Paciente, PacienteFuente } from '@/features/medical/types'

const TAMANO_LOTE = 500

// Columnas que trae el archivo y que SÍ se fusionan. `id`, `mrn`, `created_at` y `updated_at`
// los pone esta escritura, nunca la fusión: si `fusionar()` los viera (recorre
// `Object.keys(existente) ∪ Object.keys(entrante)`, no una lista declarada) un `mrn` distinto
// entre las dos filas se reportaría como choque de dato clínico, cuando en realidad es la
// identidad que el sistema mismo le asignó al paciente existente.
const CAMPOS_FUSIONABLES = [
  'nombre', 'apellido', 'fecha_nacimiento', 'genero', 'telefono', 'telefono_alt',
  'email', 'seguro', 'seguro_id', 'direccion', 'estado', 'alergias', 'condiciones', 'notas',
] as const

type CampoFusionable = (typeof CAMPOS_FUSIONABLES)[number]

function asignar<K extends CampoFusionable>(destino: Partial<Paciente>, origen: Partial<Paciente>, campo: K): void {
  const valor = origen[campo]
  if (valor !== undefined) destino[campo] = valor
}

// Recorta un objeto a SOLO los campos fusionables, sin importar qué más traiga en runtime.
// Es la defensa real: un caller que le pase la fila completa de la base (con id/mrn incluidos)
// no logra colarlos en `fusionar()`, porque acá se reconstruye el objeto campo por campo desde
// la lista declarada en vez de confiar en el tipo de TypeScript del parámetro.
function recortar(p: Partial<Paciente> | undefined): Partial<Paciente> {
  const out: Partial<Paciente> = {}
  if (!p) return out
  for (const campo of CAMPOS_FUSIONABLES) asignar(out, p, campo)
  return out
}

export interface FilaEscritura {
  // Paciente que YA existe en la base -fusión con un candidato elegido, o reimport del mismo
  // `clave_origen`-. `null` = alta nueva: esta función genera el id con `crypto.randomUUID()`
  // ANTES de escribir, y ese mismo id viaja en `pacientes` y en `paciente_fuentes`.
  id: string | null
  // Datos ya guardados del paciente, cuando `id` no es null. Puede venir con la fila COMPLETA
  // de la base (incluido id/mrn/created_at/updated_at) sin que eso rompa nada: se recorta acá
  // adentro antes de tocar `fusionar()`.
  existente?: Partial<Paciente>
  // Datos que trae el archivo para esta fila.
  entrante: Partial<Paciente>
  fuente: Pick<PacienteFuente, 'fuente' | 'clave_origen' | 'nombre_origen' | 'ref_externa'>
}

// Trocea un array en grupos de `tamano`, sin lotes vacíos: 1.000 filas con tamaño 500 da 2
// lotes, no 3. Pura, sin red -así se testea sin mockear nada.
export function lotes<T>(filas: readonly T[], tamano: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < filas.length; i += tamano) out.push(filas.slice(i, i + tamano))
  return out
}

function resolverPaciente(fila: Pick<FilaEscritura, 'existente' | 'entrante'>): Partial<Paciente> {
  const { paciente } = fusionar(recortar(fila.existente), recortar(fila.entrante))
  return paciente
}

// Todas las columnas de `pacientes` que trae el import, con `null` explícito cuando falta -
// PostgREST exige el mismo conjunto de claves en todo el array del upsert (`PGRST102` si no).
// La lista sale de los campos declarados arriba, nunca de `Object.keys` de la fila: el 86% de
// eClinPro no trae email y `telefono_alt` se omite cuando es igual a `telefono`, así que
// `Object.keys` produciría un conjunto de claves distinto por fila.
function payloadPaciente(id: string, v: Partial<Paciente>): Partial<Paciente> & { id: string } {
  return {
    id,
    nombre: v.nombre ?? '',
    apellido: v.apellido ?? '',
    fecha_nacimiento: v.fecha_nacimiento ?? null,
    genero: v.genero ?? null,
    telefono: v.telefono ?? null,
    telefono_alt: v.telefono_alt ?? null,
    email: v.email ?? null,
    seguro: v.seguro ?? null,
    seguro_id: v.seguro_id ?? null,
    direccion: v.direccion ?? null,
    estado: v.estado ?? 'activo',
    alergias: v.alergias ?? null,
    condiciones: v.condiciones ?? null,
    notas: v.notas ?? null,
  }
}

function payloadFuente(pacienteId: string, fuente: FilaEscritura['fuente']): PacienteFuente {
  return {
    paciente_id: pacienteId,
    fuente: fuente.fuente,
    clave_origen: fuente.clave_origen,
    nombre_origen: fuente.nombre_origen ?? null,
    ref_externa: fuente.ref_externa ?? null,
    importado_at: new Date().toISOString(),
  }
}

export interface ResultadoEscritura {
  lotesTotales: number
  lotesEscritos: number
  filasEscritas: number
  filasTotales: number
  error: { mensaje: string; paso: 'pacientes' | 'fuentes'; lote: number } | null
}

// Sin transacción: son ~10 lotes por HTTP. Si un lote falla, se corta ahí -no se sigue de largo
// en silencio- y se devuelve qué quedó escrito para que quien llama pueda decirlo. El plan NO
// se recalcula acá adentro: un reintento vuelve a armar el plan contra el estado real de la
// base (matcheo incluido) y llama de nuevo con filas nuevas; esta función solo escribe.
export async function escribirImport(filas: readonly FilaEscritura[]): Promise<ResultadoEscritura> {
  // El id se resuelve UNA sola vez, antes de cualquier request: así el mismo lote reintentado
  // por la capa de red (no por el llamador) manda siempre el mismo id, y el upsert por
  // `onConflict: 'id'` lo vuelve inofensivo en vez de duplicar el paciente.
  const resueltas = filas.map((fila) => ({ ...fila, id: fila.id ?? crypto.randomUUID() }))
  const gruposDeFilas = lotes(resueltas, TAMANO_LOTE)

  let filasEscritas = 0
  for (let i = 0; i < gruposDeFilas.length; i++) {
    const grupo = gruposDeFilas[i]
    const lotePacientes = grupo.map((f) => payloadPaciente(f.id, resolverPaciente(f)))
    const loteFuentes = grupo.map((f) => payloadFuente(f.id, f.fuente))

    const { error: errorPacientes } = await upsertPacientes(lotePacientes)
    if (errorPacientes) {
      return {
        lotesTotales: gruposDeFilas.length, lotesEscritos: i,
        filasEscritas, filasTotales: filas.length,
        error: { mensaje: errorPacientes.message, paso: 'pacientes', lote: i },
      }
    }

    const { error: errorFuentes } = await upsertPacienteFuentes(loteFuentes)
    if (errorFuentes) {
      // Los pacientes de ESTE lote sí quedaron escritos -solo falló la identidad de origen-,
      // así que cuentan en `filasEscritas` aunque el lote no se dé por completo.
      return {
        lotesTotales: gruposDeFilas.length, lotesEscritos: i,
        filasEscritas: filasEscritas + lotePacientes.length, filasTotales: filas.length,
        error: { mensaje: errorFuentes.message, paso: 'fuentes', lote: i },
      }
    }

    filasEscritas += lotePacientes.length
  }

  return {
    lotesTotales: gruposDeFilas.length, lotesEscritos: gruposDeFilas.length,
    filasEscritas, filasTotales: filas.length, error: null,
  }
}
