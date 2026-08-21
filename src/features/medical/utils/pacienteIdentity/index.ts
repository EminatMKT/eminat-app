// Identidad de un paciente en el import de eClinicalWorks / eClinPro / eMedicalPractice:
// cómo se parte un nombre según de qué sistema viene, y con qué clave se reconoce la misma
// fila la próxima vez que se importe el mismo archivo. Funciones puras, nunca lanzan.

import { repararMojibake, normalizarCaja, normalizarChart } from '../normalizers'
import type { FuentePaciente } from '@/features/medical/constants'

// eMedicalPractice trae First/Last en columnas separadas: meterle un separador en el medio
// inventaría un formato que el archivo no tiene, y esa cadena inventada terminaría dentro de
// la clave de identidad.
export type Crudo = string | { first: string; last: string }

type ParseoNombre = { nombre: string; apellido: string; nota: string | null; ambiguo: boolean }

type FilaClave = { nombreCrudo?: string; dobCrudo?: string; chart?: string; fila?: number }

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

  const nombreNorm = normalizarParaComparar(fila.nombreCrudo ?? '')
  const dob = (fila.dobCrudo ?? '').trim()

  // Sin DOB, dos homónimos calculan la misma clave y se funden en un solo paciente: el índice
  // de fila los distingue.
  if (!dob) {
    return `${nombreNorm}|${fila.fila ?? ''}`
  }
  return `${nombreNorm}|${dob}`
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
