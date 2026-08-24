// Escritura por lotes del plan de import de pacientes. No decide identidad ni matcheo -eso es
// `pacienteIdentity/` y `@/shared/import`-, solo escribe lo que ya se decidió: en lotes de
// ~500, `pacientes` antes que `paciente_fuentes`, con el id que generó el cliente. Ver
// "## Escritura" en docs/superpowers/specs/2026-08-21-pacientes-import-design.md.
import { upsertPacientes, upsertPacienteFuentes, upsertPacienteContactos } from '@/features/medical/data/pacientes'
import { fusionar } from '@/features/medical/utils/pacienteIdentity'
import { ESTADO_PACIENTE_DEFAULT } from '@/features/medical/constants'
import type { ContactoEntrante } from '@/features/medical/utils/pacienteImportPlan'
import type { Paciente, PacienteFuente, PacienteContacto } from '@/features/medical/types'

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

// `dob_origen` es opcional -y NO un `Pick` directo de `PacienteFuente`, donde es obligatorio-
// porque la mayoría de los tests de este archivo (y el alta manual, que no pasa por acá) no
// traen ninguno: pedirlo obligatorio forzaría a cada fixture a inventar un valor que no tiene.
type FuenteEscritura = Pick<PacienteFuente, 'fuente' | 'clave_origen' | 'nombre_origen' | 'ref_externa'> & {
  dob_origen?: string | null
}

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
// `contactos` es opcional: la mayoría de los tests de este archivo (y del alta manual, que no
// pasa por acá) no traen ninguno. Cuando falta, se trata como lista vacía -no hay nada que
// escribir en `paciente_contactos` para esa fila.
export type FilaEscritura =
  | { tipo: 'nueva'; entrante: Partial<Paciente>; fuente: FuenteEscritura; contactos?: ContactoEntrante[] }
  | { tipo: 'existente'; id: string; existente: Partial<Paciente>; entrante: Partial<Paciente>; fuente: FuenteEscritura; contactos?: ContactoEntrante[] }

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
  contactos: ContactoEntrante[]
  origenIndice: number
}

// El id se resuelve UNA sola vez, antes de cualquier request: así el mismo lote reintentado
// por la capa de red (no por el llamador) manda siempre el mismo id, y el upsert por
// `onConflict: 'id'` lo vuelve inofensivo en vez de duplicar el paciente.
function resolverId(fila: FilaEscritura, origenIndice: number): FilaResuelta {
  const contactos = fila.contactos ?? []
  if (fila.tipo === 'nueva') return { id: crypto.randomUUID(), entrante: fila.entrante, fuente: fila.fuente, contactos, origenIndice }
  return { id: fila.id, existente: fila.existente, entrante: fila.entrante, fuente: fila.fuente, contactos, origenIndice }
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
    // Nada se descarta sin aparecer en una de las líneas de `ResultadoEscritura`: los choques
    // que `fusionar` devuelve y antes se tiraban (`.paciente` solo) se acumulan acá.
    const choques: string[] = []
    for (const m of miembros) {
      const r = fusionar(acumulado, recortar(m.entrante))
      acumulado = r.paciente
      choques.push(...r.choques)
    }
    return {
      id, paciente: acumulado, choques,
      miembros: miembros.map((m) => ({ fuente: m.fuente, contactos: m.contactos, origenIndice: m.origenIndice })),
    }
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
    // Lo que dijo ESTA fila del DOB, en crudo -tal como vino en el archivo, sin interpretar-.
    // Es lo que permite reconstruir qué dijo cada sistema cuando dos fuentes se contradicen
    // (ver `pacienteIdentity.NO_SON_CHOQUE`: fecha_nacimiento SÍ sigue siendo choque, y acá
    // queda la evidencia para decidirlo).
    dob_origen: fuente.dob_origen ?? null,
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
  // Un choque por cada campo que `fusionar` reportó, UNA vez por cada miembro que chocó -no
  // dedupeado-: es lo que hace que `contarChoques` pueda contar "2 filas con fecha_nacimiento
  // en conflicto" en vez de solo "hubo un conflicto en este paciente".
  choques: string[]
  // Casi siempre uno -salvo el colapso de `agruparPorId`, donde dos filas del archivo apuntan
  // al mismo paciente y cada una necesita su propia fila en `paciente_fuentes` (y sus propios
  // contactos, con SU fuente -no la del paciente fusionado-).
  miembros: { fuente: FuenteEscritura; contactos: ContactoEntrante[]; origenIndice: number }[]
}

// Cuenta los choques del lote entero, agrupados por campo -lo que ve el resumen del paso 6.
// Solo mira `listas` (los grupos que SÍ se van a escribir): un grupo rechazado por nombre vacío
// ya se reporta por `rechazadas`, y contar su choque además sería el mismo dato dos veces.
function contarChoques(listas: readonly FilaLista[]): { campo: string; n: number }[] {
  const conteo = new Map<string, number>()
  for (const lista of listas) {
    for (const campo of lista.choques) conteo.set(campo, (conteo.get(campo) ?? 0) + 1)
  }
  return Array.from(conteo.entries()).map(([campo, n]) => ({ campo, n }))
}

// Misma forma que espera `upsertPacienteContactos`: la fila de `paciente_contactos` sin las
// columnas que pone la base (`id`, `created_at`). Con nombre propio para no repetir el `Omit`
// en cada firma de acá abajo.
type ContactoPayload = Omit<PacienteContacto, 'id' | 'created_at'>

// Los contactos de un paciente ya agrupado: uno por cada (tipo, valor) que trajo cada miembro,
// con la fuente de ESE miembro -no la del paciente fusionado, que no significa nada para un
// contacto individual.
function payloadContactos(id: string, miembros: FilaLista['miembros']): ContactoPayload[] {
  return miembros.flatMap((m) =>
    m.contactos.map((c) => ({
      paciente_id: id,
      tipo: c.tipo,
      valor: c.valor,
      fuente: m.fuente.fuente,
      clave_origen: m.fuente.clave_origen,
    })),
  )
}

// Dedup por la MISMA clave que el UNIQUE de la base.
//
// Ojo con el porqué, porque es fácil escribirlo mal: con `ignoreDuplicates: true` (DO NOTHING)
// el lote NO aborta aunque vayan dos filas iguales — verificado contra Postgres. O sea que esto
// no es lo que evita el crash; lo que lo evita es esa opción en `data/pacientes.ts`.
// Se dedupea igual por dos razones concretas: que `contactosEscritos` cuente lo que de verdad
// se escribió y no lo que se mandó, y que el día que alguien cambie a DO UPDATE el lote no
// empiece a abortar en silencio.
function dedupeContactos(rows: ContactoPayload[]): ContactoPayload[] {
  const vistos = new Set<string>()
  return rows.filter((r) => {
    const k = `${r.paciente_id}|${r.tipo}|${r.valor}|${r.fuente}`
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
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
  // Cuenta lo que de verdad se escribió (después del dedup de lote), no lo que se mandó.
  contactosEscritos: number
  // Lo que `fusionar` reportó como conflicto real -hoy: fecha_nacimiento y genero- agrupado por
  // campo. Nada se descarta sin aparecer acá: es la regla del spec anterior, aplicada al caso
  // que se le escapaba (ver "## 4" del spec de contactos multivaluados).
  choques: { campo: string; n: number }[]
  error: { mensaje: string; paso: 'pacientes' | 'fuentes' | 'contactos'; lote: number } | null
}

// Sin transacción: son ~10 lotes por HTTP. Si un lote falla, se corta ahí -no se sigue de largo
// en silencio- y se devuelve qué quedó escrito para que quien llama pueda decirlo. El plan NO
// se recalcula acá adentro: un reintento vuelve a armar el plan contra el estado real de la
// base (matcheo incluido) y llama de nuevo con filas nuevas; esta función solo escribe.
//
// El orden dentro de un lote es SIEMPRE pacientes → paciente_fuentes → paciente_contactos: un
// contacto sin paciente viola la FK.
export async function escribirImport(filas: readonly FilaEscritura[]): Promise<ResultadoEscritura> {
  const { listas, rechazadas } = prepararFilas(filas)
  const choques = contarChoques(listas)
  const gruposDeFilas = lotes(listas, TAMANO_LOTE)

  let filasEscritas = 0
  let contactosEscritos = 0
  for (let i = 0; i < gruposDeFilas.length; i++) {
    const grupo = gruposDeFilas[i]
    const lotePacientes = grupo.map((f) => payloadPaciente(f.id, f.paciente))
    // flatMap: casi siempre un miembro por paciente, salvo el colapso de `agruparPorId` -ahí
    // un solo `id` de `pacientes` se corresponde con DOS filas de `paciente_fuentes`.
    const loteFuentes = grupo.flatMap((f) => f.miembros.map((m) => payloadFuente(f.id, m.fuente)))
    const loteContactos = dedupeContactos(grupo.flatMap((f) => payloadContactos(f.id, f.miembros)))

    const { error: errorPacientes } = await upsertPacientes(lotePacientes)
    if (errorPacientes) {
      return {
        lotesTotales: gruposDeFilas.length, lotesEscritos: i,
        filasEscritas, filasTotales: filas.length, rechazadas, contactosEscritos, choques,
        error: { mensaje: errorPacientes.message, paso: 'pacientes', lote: i },
      }
    }

    const { error: errorFuentes } = await upsertPacienteFuentes(loteFuentes)
    if (errorFuentes) {
      // Los pacientes de ESTE lote sí quedaron escritos -solo falló la identidad de origen-,
      // así que cuentan en `filasEscritas` aunque el lote no se dé por completo.
      return {
        lotesTotales: gruposDeFilas.length, lotesEscritos: i,
        filasEscritas: filasEscritas + lotePacientes.length, filasTotales: filas.length, rechazadas, contactosEscritos, choques,
        error: { mensaje: errorFuentes.message, paso: 'fuentes', lote: i },
      }
    }

    if (loteContactos.length > 0) {
      const { error: errorContactos } = await upsertPacienteContactos(loteContactos)
      if (errorContactos) {
        // Igual que arriba: pacientes y fuentes de ESTE lote ya quedaron escritos.
        return {
          lotesTotales: gruposDeFilas.length, lotesEscritos: i,
          filasEscritas: filasEscritas + lotePacientes.length, filasTotales: filas.length, rechazadas, contactosEscritos, choques,
          error: { mensaje: errorContactos.message, paso: 'contactos', lote: i },
        }
      }
      contactosEscritos += loteContactos.length
    }

    filasEscritas += lotePacientes.length
  }

  return {
    lotesTotales: gruposDeFilas.length, lotesEscritos: gruposDeFilas.length,
    filasEscritas, filasTotales: filas.length, rechazadas, contactosEscritos, choques, error: null,
  }
}
