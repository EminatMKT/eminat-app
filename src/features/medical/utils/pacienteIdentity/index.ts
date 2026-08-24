// Identidad de un paciente en el import de eClinicalWorks / eClinPro / eMedicalPractice:
// cómo se parte un nombre según de qué sistema viene, y con qué clave se reconoce la misma
// fila la próxima vez que se importe el mismo archivo. Funciones puras, nunca lanzan.

import { repararMojibake, normalizarCaja, normalizarChart, normalizarTelefono } from '../normalizers'
import type { FuentePaciente } from '@/features/medical/constants'
import type { Paciente } from '@/features/medical/types'

// eMedicalPractice trae First/Last en columnas separadas: meterle un separador en el medio
// inventaría un formato que el archivo no tiene, y esa cadena inventada terminaría dentro de
// la clave de identidad.
export type Crudo = string | { first: string; last: string }

type ParseoNombre = { nombre: string; apellido: string; nota: string | null; ambiguo: boolean }

type FilaClave = { nombreCrudo?: string; dobCrudo?: string; chart?: string; telefonoCrudo?: string; fila?: number; id?: string }

// Anotaciones conocidas que aparecen pegadas al nombre en el archivo fuente. Hoy es una sola
// ('DUPLICADO ROCHE', 157 filas), pero se deja como lista para que agregar la próxima sea
// agregar una fila, no reescribir la función.
const ANOTACIONES: RegExp[] = [/\s*DUPLICADO ROCHE\s*$/]

// Paso 2 del parseo: sacar la anotación ANTES de partir. 8 de las 157 filas anotadas no tienen
// separador, así que sin este paso primero la anotación queda adentro del apellido.
function quitarAnotacion(s: string): { texto: string; nota: string | null } {
  for (const patron of ANOTACIONES) {
    const match = patron.exec(s)
    if (match) {
      return { texto: s.slice(0, match.index).trim(), nota: match[0].trim() }
    }
  }
  return { texto: s, nota: null }
}

// Un token de una sola letra (con o sin punto: 'V' o 'V.') es una inicial de segundo nombre,
// no un apellido.
function esInicial(token: string): boolean {
  return token.replace(/\.$/, '').length === 1
}

// eClinPro sin separador: nombre = primer token + las iniciales que le sigan; apellido = desde
// el primer token de ≥2 letras. Sin un segundo token que sea claramente una inicial no hay
// forma de saber dónde termina el nombre — eso es lo que queda ambiguo.
function partirSinSeparador(texto: string): { nombre: string; apellido: string; ambiguo: boolean } {
  const tokens = texto.trim().split(/\s+/).filter(Boolean)

  if (tokens.length <= 1) {
    return { nombre: tokens[0] ?? '', apellido: '', ambiguo: false }
  }
  if (tokens.length === 2) {
    return { nombre: tokens[0], apellido: tokens[1], ambiguo: false }
  }
  if (!esInicial(tokens[1])) {
    return { nombre: tokens[0], apellido: tokens.slice(1).join(' '), ambiguo: true }
  }

  const nombreTokens = [tokens[0]]
  let i = 1
  while (i < tokens.length && esInicial(tokens[i])) {
    nombreTokens.push(tokens[i])
    i++
  }
  return { nombre: nombreTokens.join(' '), apellido: tokens.slice(i).join(' '), ambiguo: false }
}

export function parseNombre(fuente: FuentePaciente, crudo: Crudo): ParseoNombre {
  // eMedicalPractice: columnas ya separadas, no hay nada que partir.
  if (typeof crudo === 'object') {
    const first = repararMojibake(crudo.first ?? '')
    const last = repararMojibake(crudo.last ?? '')
    return { nombre: normalizarCaja(first), apellido: normalizarCaja(last), nota: null, ambiguo: false }
  }

  // Paso 1: reparar encoding. Paso 2: quitar anotación. Recién ahí se parte.
  const reparado = repararMojibake(crudo)
  const { texto, nota } = quitarAnotacion(reparado)

  if (fuente === 'ecw') {
    // APELLIDO,NOMBRE — una sola coma garantizada por la fuente.
    const idx = texto.indexOf(',')
    const apellidoCrudo = idx >= 0 ? texto.slice(0, idx) : texto
    const nombreCrudo = idx >= 0 ? texto.slice(idx + 1) : ''
    return { nombre: normalizarCaja(nombreCrudo), apellido: normalizarCaja(apellidoCrudo), nota, ambiguo: false }
  }

  // eclinpro (y manual, si algún día llega en texto libre): con separador explícito o sin él.
  if (texto.includes(' - ')) {
    const [nombreCrudo, apellidoCrudo] = texto.split(' - ')
    return { nombre: normalizarCaja(nombreCrudo ?? ''), apellido: normalizarCaja(apellidoCrudo ?? ''), nota, ambiguo: false }
  }

  const partido = partirSinSeparador(texto)
  return { nombre: normalizarCaja(partido.nombre), apellido: normalizarCaja(partido.apellido), nota, ambiguo: partido.ambiguo }
}

// Sin acentos, minúsculas, sin puntuación, espacios colapsados. Reusado tanto para la clave de
// origen (sobre el nombre crudo completo) como para el núcleo de comparación (sobre nombre y
// apellido ya parseados).
function normalizarParaComparar(s: string): string {
  return repararMojibake(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// La clave sale del dato CRUDO, nunca del interpretado: si saliera del nombre ya partido o de
// la fecha ya convertida, corregir una fila en el saneamiento haría que el import siguiente
// calcule otra clave y la duplique.
export function claveOrigen(fuente: FuentePaciente, fila: FilaClave): string {
  if (fuente === 'emed') {
    return normalizarChart(fila.chart ?? '')
  }

  // Un paciente manual no viene de ningún sistema externo del que reconocer una fila el mes
  // que viene: su clave es su propio id, no una derivación del nombre que alguien puede editar.
  if (fuente === 'manual') {
    return String(fila.id ?? '')
  }

  const nombreNorm = normalizarParaComparar(fila.nombreCrudo ?? '')
  const dob = (fila.dobCrudo ?? '').trim()
  if (dob) return `${nombreNorm}|${dob}`

  // Sin DOB, dos homónimos calculan la misma clave y se funden en un solo paciente: hace falta
  // un desempate. El teléfono normalizado es mejor que el índice de fila -medido contra las 41
  // filas sin DOB del archivo real, las 41 traen teléfono y da 40 claves distintas (el índice
  // también daba 41, pero por una razón que se rompe sola): el índice depende de la POSICIÓN de
  // la fila en `sanitizedRows`, que el paso 4 compacta al excluir filas -si el operador excluye
  // distinto entre dos sesiones del mismo archivo, la clave cambia y el reimport ya no reconoce
  // la fila, duplicando el paciente. El teléfono no se mueve cuando se excluye OTRA fila.
  // El índice queda como ÚLTIMO recurso -sin DOB y sin teléfono, 0 filas hoy- para que dos
  // homónimos sin ningún dato de contacto sigan sin fundirse en un solo paciente.
  const tel = normalizarTelefono(fila.telefonoCrudo ?? '').valor
  if (tel) return `${nombreNorm}|tel:${tel}`
  return `${nombreNorm}|${fila.fila ?? ''}`
}

// Multiconjunto ordenado de tokens de ≥2 letras, para la fusión entre fuentes. Las iniciales
// quedan afuera del núcleo comparable, y NO se deduplica: 'Hernandez Hernandez' tiene que seguir
// distinguiéndose de 'Hernandez' solo.
export function nucleo(nombre: string, apellido: string): string[] {
  return normalizarParaComparar(`${nombre} ${apellido}`)
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .sort()
}

// Lo mínimo que el matcheo mira. `telefono`/`email` quedan opcionales -y no un Pick directo
// de Paciente- porque una fila recién parseada o un paciente ya guardado pueden no traerlos:
// pedirlos obligatorios forzaría a cada fixture a inventar un valor que no tiene.
type Contacto = Partial<Pick<Paciente, 'telefono' | 'email'>>

export type Identificable = Pick<Paciente, 'id' | 'nombre' | 'apellido' | 'fecha_nacimiento'> & Contacto

function tieneValor(v: unknown): boolean {
  return v !== undefined && v !== null && v !== ''
}

// Multiset A contenido en multiset B: cada token de A aparece en B con multiplicidad al
// menos igual. 'hernandez' repetido dos veces en A necesita dos 'hernandez' en B, no uno.
function contieneMultiset(grande: readonly string[], chico: readonly string[]): boolean {
  const restante = [...grande]
  for (const token of chico) {
    const idx = restante.indexOf(token)
    if (idx === -1) return false
    restante.splice(idx, 1)
  }
  return true
}

type RelacionNucleos = 'igual' | 'contiene' | 'ninguna'

function relacionNucleos(a: readonly string[], b: readonly string[]): RelacionNucleos {
  const aEnB = contieneMultiset(b, a)
  const bEnA = contieneMultiset(a, b)
  if (aEnB && bEnA) return 'igual'
  if (aEnB || bEnA) return 'contiene'
  return 'ninguna'
}

// Una coincidencia exacta baja a parcial SOLO si teléfono Y email tienen valor en los dos
// lados y ninguno de los dos coincide. Si de un lado falta el dato, no hay evidencia de que
// sean personas distintas: el 86% de eClinPro no trae email, y "ausente" no es "disjunto".
function contactoDisjunto(a: Contacto, b: Contacto): boolean {
  const telefonoAmbos = tieneValor(a.telefono) && tieneValor(b.telefono)
  const emailAmbos = tieneValor(a.email) && tieneValor(b.email)
  if (!telefonoAmbos || !emailAmbos) return false
  return a.telefono !== b.telefono && a.email !== b.email
}

// Dos niveles de matcheo: 'exacta' -mismo núcleo de nombre y mismo DOB, sin contacto
// disjunto- y 'parcial' -un núcleo contenido en el otro, o una exacta degradada por
// contacto disjunto-.
type NivelMatch = 'exacta' | 'parcial'
type Candidato = { nivel: NivelMatch; paciente: Identificable }

// Sin DOB no hay candidatos: es el único ancla dura que tenemos. Eso NO cambia.
// Lo que cambia: con DOB en los dos lados pero distinto, el núcleo igual + un teléfono
// compartido alcanza para ofrecer una fusión PARCIAL. Medido sobre el archivo real: 76 núcleos
// con dos DOB comparten teléfono (la misma persona con una fecha mal cargada) y 59 no (homónimos
// distintos, que siguen separados). Sin la condición del teléfono, esto fusionaría homónimos.
export function candidatos(
  fila: Omit<Identificable, 'id'>,
  pacientes: readonly Identificable[],
): Candidato[] {
  if (!fila.fecha_nacimiento) return []

  const nucleoFila = nucleo(fila.nombre, fila.apellido)
  const resultado: Candidato[] = []

  for (const paciente of pacientes) {
    const mismoDob = paciente.fecha_nacimiento === fila.fecha_nacimiento
    const relacion = relacionNucleos(nucleoFila, nucleo(paciente.nombre, paciente.apellido))
    if (relacion === 'ninguna') continue

    if (!mismoDob) {
      // Nunca 'exacta': la fecha no coincide, así que la evidencia es más débil por definición.
      // Parcial = sin pre-marcar, la persona decide con las dos fechas enfrentadas en pantalla.
      if (relacion === 'igual' && telefonoCompartido(fila, paciente)) {
        resultado.push({ nivel: 'parcial', paciente })
      }
      continue
    }

    const nivel: NivelMatch =
      relacion === 'igual' && !contactoDisjunto(fila, paciente) ? 'exacta' : 'parcial'
    resultado.push({ nivel, paciente })
  }
  return resultado
}

function telefonoCompartido(a: Contacto, b: Contacto): boolean {
  return tieneValor(a.telefono) && tieneValor(b.telefono) && a.telefono === b.telefono
}

// Un segundo teléfono o un segundo email NO son un conflicto: son otro contacto, y viven en
// `paciente_contactos` (Tarea 5). Siguen fusionándose como campo principal -el existente sigue
// ganando, `paciente_contactos` no cambia ese comportamiento- pero dejan de contarse como choque:
// si no, el usuario vería 681 "conflictos" que en realidad son personas con dos números.
const NO_SON_CHOQUE = new Set<keyof Paciente>(['telefono', 'email'])

// Campo con valor gana sobre el entrante; solo se rellenan los vacíos. Si los dos tienen
// valor y difieren, el existente sigue ganando pero el choque se anota -nada se resuelve
// en silencio- salvo que el campo esté en `NO_SON_CHOQUE`.
function fusionarCampoSimple<K extends keyof Paciente>(
  paciente: Partial<Paciente>,
  choques: string[],
  campo: K,
  valorExistente: Paciente[K] | undefined,
  valorEntrante: Paciente[K] | undefined,
): void {
  if (tieneValor(valorExistente)) {
    if (tieneValor(valorEntrante) && valorExistente !== valorEntrante && !NO_SON_CHOQUE.has(campo)) {
      choques.push(String(campo))
    }
    paciente[campo] = valorExistente
    return
  }
  if (tieneValor(valorEntrante)) {
    paciente[campo] = valorEntrante
  }
}

// El nombre se resuelve como UNA partición: se comparan los núcleos de nombre+apellido una
// sola vez, y si uno contiene al otro se adoptan los DOS campos del más completo. Comparar
// nombre y apellido por separado deja que cada lado promueva su propio más largo, y la
// inicial termina duplicada en los dos campos ('Maria F' / 'F Candia').
export function fusionar(
  existente: Partial<Paciente>,
  entrante: Partial<Paciente>,
): { paciente: Partial<Paciente>; choques: string[] } {
  const paciente: Partial<Paciente> = {}
  const choques: string[] = []

  const nucleoExistente = nucleo(existente.nombre ?? '', existente.apellido ?? '')
  const nucleoEntrante = nucleo(entrante.nombre ?? '', entrante.apellido ?? '')
  const relacion = relacionNucleos(nucleoExistente, nucleoEntrante)

  if (relacion === 'ninguna') {
    fusionarCampoSimple(paciente, choques, 'nombre', existente.nombre, entrante.nombre)
    fusionarCampoSimple(paciente, choques, 'apellido', existente.apellido, entrante.apellido)
  } else if (relacion === 'contiene' && contieneMultiset(nucleoEntrante, nucleoExistente)) {
    // el entrante contiene al existente: es el más completo, adopta sus dos campos juntos.
    paciente.nombre = entrante.nombre
    paciente.apellido = entrante.apellido
  } else {
    // núcleos iguales, o el existente es el más completo: se queda como está.
    paciente.nombre = existente.nombre
    paciente.apellido = existente.apellido
  }

  const campos = new Set<keyof Paciente>([
    ...(Object.keys(existente) as (keyof Paciente)[]),
    ...(Object.keys(entrante) as (keyof Paciente)[]),
  ])
  campos.delete('nombre')
  campos.delete('apellido')

  for (const campo of Array.from(campos)) {
    fusionarCampoSimple(paciente, choques, campo, existente[campo], entrante[campo])
  }

  return { paciente, choques }
}
