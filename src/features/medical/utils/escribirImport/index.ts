// Escritura por lotes del plan de import de pacientes. No decide identidad ni matcheo -eso es
// `pacienteIdentity/` y `@/shared/import`-, solo escribe lo que ya se decidió: en lotes de
// ~500, `pacientes` antes que `paciente_fuentes`, con el id que generó el cliente. Ver
// "## Escritura" en docs/superpowers/specs/2026-08-21-pacientes-import-design.md.
import { upsertPacientes, upsertPacienteFuentes } from '@/features/medical/data/pacientes'
import { fusionar } from '@/features/medical/utils/pacienteIdentity'
import { ESTADO_PACIENTE_DEFAULT } from '@/features/medical/constants'
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

type FuenteEscritura = Pick<PacienteFuente, 'fuente' | 'clave_origen' | 'nombre_origen' | 'ref_externa'>

// Unión discriminada por `tipo`, no un `existente?` suelto: con un campo opcional, un caller
// puede armar `{ id: 'uuid-real', entrante }` sin `existente`, y esa fila pisa CON NULL el
// resto de un paciente que ya existía -sin fusión, sin error, en una tabla de PHI-. Con la
// unión, "hay id pero no existente" deja de poder escribirse: el compilador lo rechaza en vez
// de que lo descubra un paciente al que se le borró el teléfono.
//
// El discriminante es `tipo` (string literal) y NO `id: null | string`: este repo corre con
// `strict: false` en `tsconfig.json` -o sea `strictNullChecks` apagado-, y ahí `null` es
// asignable a cualquier tipo, así que TypeScript no logra angostar la unión comparando contra
// `null`. Con un literal de texto la angostura no depende de esa opción.
export type FilaEscritura =
  | { tipo: 'nueva'; entrante: Partial<Paciente>; fuente: FuenteEscritura }
  | { tipo: 'existente'; id: string; existente: Partial<Paciente>; entrante: Partial<Paciente>; fuente: FuenteEscritura }

// Misma forma que `FilaEscritura` pero con el id YA resuelto -string siempre-, para el resto
// del módulo. `existente` sigue opcional acá: ausente de verdad en una alta nueva, nunca por
// descuido, porque solo `resolverId` la construye. `origenIndice` es la posición en el array
// de `filas` que recibió `escribirImport` -la necesita `agruparPorId` para que una fila
// rechazada siga pudiendo reportar SU índice después de agruparse con otra.
interface FilaResuelta {
  id: string
  existente?: Partial<Paciente>
  entrante: Partial<Paciente>
  fuente: FuenteEscritura
  origenIndice: number
}

// El id se resuelve UNA sola vez, antes de cualquier request: así el mismo lote reintentado
// por la capa de red (no por el llamador) manda siempre el mismo id, y el upsert por
// `onConflict: 'id'` lo vuelve inofensivo en vez de duplicar el paciente.
function resolverId(fila: FilaEscritura, origenIndice: number): FilaResuelta {
  if (fila.tipo === 'nueva') return { id: crypto.randomUUID(), entrante: fila.entrante, fuente: fila.fuente, origenIndice }
  return { id: fila.id, existente: fila.existente, entrante: fila.entrante, fuente: fila.fuente, origenIndice }
}

// Trocea un array en grupos de `tamano`, sin lotes vacíos: 1.000 filas con tamaño 500 da 2
// lotes, no 3. Pura, sin red -así se testea sin mockear nada.
export function lotes<T>(filas: readonly T[], tamano: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < filas.length; i += tamano) out.push(filas.slice(i, i + tamano))
  return out
}

// Un candidato de fusión por similitud (`pacienteIdentity.candidatos`) no distingue nombres
// -"MARIA GARCIA" y "MARIA G GARCIA" tienen `clave_origen` distinta pero el mismo NÚCLEO- así
// que dos filas del archivo pueden resolver al MISMO paciente existente sin ser la misma fila
// (`colapsarRepetidas` no las junta: compara la clave completa, no el núcleo). Sin agrupar acá,
// las dos llegan a `upsertPacientes` con el mismo `id` en el mismo array y Postgres aborta el
// lote ENTERO con "ON CONFLICT DO UPDATE command cannot affect row a second time" -verificado
// contra el Postgres local-, y no se escribe nada, ni siquiera las filas buenas del lote.
//
// Dos filas que apuntan al mismo paciente son UN paciente con DOS identidades de origen: se
// escribe una sola fila en `pacientes` (fusionando los entrantes, en el mismo orden en que
// aparecen en el archivo -cada miembro se fusiona sobre el resultado del anterior, así que el
// primero gana un choque contra el segundo igual que ganaría contra la base) y DOS filas en
// `paciente_fuentes` (`clave_origen` distinta en cada una: es la traza de que la misma persona
// entró por dos variantes de su nombre, y esa traza no se pierde).
function agruparPorId(filas: readonly FilaResuelta[]): FilaLista[] {
  const orden: string[] = []
  const grupos = new Map<string, FilaResuelta[]>()
  for (const f of filas) {
    if (!grupos.has(f.id)) { grupos.set(f.id, []); orden.push(f.id) }
    grupos.get(f.id)!.push(f)
  }
  return orden.map((id) => {
    const miembros = grupos.get(id)!
    let acumulado = recortar(miembros[0].existente)
    for (const m of miembros) acumulado = fusionar(acumulado, recortar(m.entrante)).paciente
    return { id, paciente: acumulado, miembros: miembros.map((m) => ({ fuente: m.fuente, origenIndice: m.origenIndice })) }
  })
}

function vacio(v: string | undefined): boolean {
  return !v || v.trim() === ''
}

// Todas las columnas de `pacientes` que trae el import, con `null` explícito cuando falta -
// PostgREST exige el mismo conjunto de claves en todo el array del upsert (`PGRST102` si no).
// La lista sale de los campos declarados arriba, nunca de `Object.keys` de la fila: el 86% de
// eClinPro no trae email y `telefono_alt` se omite cuando es igual a `telefono`, así que
// `Object.keys` produciría un conjunto de claves distinto por fila. `nombre`/`apellido` llegan
// ya validados por `prepararFilas` -acá no se vuelve a chequear, solo se arma la columna.
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
    // Mismo valor que el DOMAIN de la migración -ver el comentario de la constante-, nunca un
    // literal repetido acá: el día que el catálogo cambia, este archivo lo hereda solo.
    estado: v.estado ?? ESTADO_PACIENTE_DEFAULT,
    alergias: v.alergias ?? null,
    condiciones: v.condiciones ?? null,
    notas: v.notas ?? null,
  }
}

function payloadFuente(pacienteId: string, fuente: FuenteEscritura): PacienteFuente {
  return {
    paciente_id: pacienteId,
    fuente: fuente.fuente,
    clave_origen: fuente.clave_origen,
    nombre_origen: fuente.nombre_origen ?? null,
    // Lo que dijo esta fila del DOB, en crudo. Nadie la llena todavía -queda para la tarea que
    // consuma el gate del DOB-, así que por ahora siempre null: no es el default silencioso de
    // un campo que se ignora, es que este paso del plan no lo produce.
    dob_origen: null,
    ref_externa: fuente.ref_externa ?? null,
    importado_at: new Date().toISOString(),
  }
}

export interface FilaRechazada {
  indice: number
  claveOrigen: string
  motivo: 'sin_nombre' | 'sin_apellido'
}

interface FilaLista {
  id: string
  paciente: Partial<Paciente>
  // Casi siempre uno -salvo el colapso de `agruparPorId`, donde dos filas del archivo apuntan
  // al mismo paciente y cada una necesita su propia fila en `paciente_fuentes`.
  miembros: { fuente: FuenteEscritura; origenIndice: number }[]
}

// Límite de confianza: acá entran datos de un archivo. `pacientes_nombre_no_vacio` y
// `pacientes_apellido_no_vacio` rechazan la fila en la base, pero rechazan el LOTE entero -500
// filas adentro, con un mensaje de constraint que no dice cuál fue-. El saneamiento de la
// pantalla de import (Tarea 10b) debería garantizar que esto no llegue vacío; esta función no
// se apoya en eso y valida igual, ANTES del primer request. Nada se descarta en silencio: la
// fila rechazada no entra a ningún lote, pero sí a `rechazadas`, con su índice y su
// `clave_origen` para que quien resuma el import la pueda contar.
//
// La validación corre sobre el paciente YA agrupado (`agruparPorId`): un grupo de dos filas es
// UN paciente, y si ese paciente fusionado queda sin nombre no hay "mitad" que escribir -las
// DOS filas de origen se rechazan, cada una con su propio índice y su propia clave_origen, para
// que ninguna de las dos desaparezca del resumen en silencio.
function prepararFilas(filas: readonly FilaEscritura[]): { listas: FilaLista[]; rechazadas: FilaRechazada[] } {
  const resueltas = filas.map((fila, indice) => resolverId(fila, indice))
  const grupos = agruparPorId(resueltas)

  const listas: FilaLista[] = []
  const rechazadas: FilaRechazada[] = []

  grupos.forEach((grupo) => {
    const sinNombre = vacio(grupo.paciente.nombre)
    const motivo = sinNombre ? 'sin_nombre' : vacio(grupo.paciente.apellido) ? 'sin_apellido' : null
    if (motivo) {
      grupo.miembros.forEach((m) => rechazadas.push({ indice: m.origenIndice, claveOrigen: m.fuente.clave_origen, motivo }))
      return
    }
    listas.push(grupo)
  })

  return { listas, rechazadas }
}

export interface ResultadoEscritura {
  lotesTotales: number
  lotesEscritos: number
  filasEscritas: number
  filasTotales: number
  rechazadas: FilaRechazada[]
  error: { mensaje: string; paso: 'pacientes' | 'fuentes'; lote: number } | null
}

// Sin transacción: son ~10 lotes por HTTP. Si un lote falla, se corta ahí -no se sigue de largo
// en silencio- y se devuelve qué quedó escrito para que quien llama pueda decirlo. El plan NO
// se recalcula acá adentro: un reintento vuelve a armar el plan contra el estado real de la
// base (matcheo incluido) y llama de nuevo con filas nuevas; esta función solo escribe.
export async function escribirImport(filas: readonly FilaEscritura[]): Promise<ResultadoEscritura> {
  const { listas, rechazadas } = prepararFilas(filas)
  const gruposDeFilas = lotes(listas, TAMANO_LOTE)

  let filasEscritas = 0
  for (let i = 0; i < gruposDeFilas.length; i++) {
    const grupo = gruposDeFilas[i]
    const lotePacientes = grupo.map((f) => payloadPaciente(f.id, f.paciente))
    // flatMap: casi siempre un miembro por paciente, salvo el colapso de `agruparPorId` -ahí
    // un solo `id` de `pacientes` se corresponde con DOS filas de `paciente_fuentes`.
    const loteFuentes = grupo.flatMap((f) => f.miembros.map((m) => payloadFuente(f.id, m.fuente)))

    const { error: errorPacientes } = await upsertPacientes(lotePacientes)
    if (errorPacientes) {
      return {
        lotesTotales: gruposDeFilas.length, lotesEscritos: i,
        filasEscritas, filasTotales: filas.length, rechazadas,
        error: { mensaje: errorPacientes.message, paso: 'pacientes', lote: i },
      }
    }

    const { error: errorFuentes } = await upsertPacienteFuentes(loteFuentes)
    if (errorFuentes) {
      // Los pacientes de ESTE lote sí quedaron escritos -solo falló la identidad de origen-,
      // así que cuentan en `filasEscritas` aunque el lote no se dé por completo.
      return {
        lotesTotales: gruposDeFilas.length, lotesEscritos: i,
        filasEscritas: filasEscritas + lotePacientes.length, filasTotales: filas.length, rechazadas,
        error: { mensaje: errorFuentes.message, paso: 'fuentes', lote: i },
      }
    }

    filasEscritas += lotePacientes.length
  }

  return {
    lotesTotales: gruposDeFilas.length, lotesEscritos: gruposDeFilas.length,
    filasEscritas, filasTotales: filas.length, rechazadas, error: null,
  }
}
