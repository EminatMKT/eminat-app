// Normalizadores del registro de pacientes (import de eClinicalWorks / eClinPro /
// eMedicalPractice). Funciones puras: nunca lanzan, nunca descartan en silencio. Las que
// pueden fallar devuelven `{ valor, marcada, motivo? }` para que el paso 4 del import decida —
// no una excepción, no un valor inventado.

import { localDate } from '@/shared/utils/dates'
import { resolveToCanonical } from '@/shared/utils/canonical'
import { GENEROS } from '@/features/medical/constants'

type Marcable<T> = { valor: T; marcada: boolean; motivo?: string }

// Repara el caso típico de UTF-8 leído como latin-1 ('PeÃ±a' → 'Peña'). Solo si el resultado es
// una conversión válida: si `escape`/`decodeURIComponent` tira, se devuelve el original. Es
// idempotente — un nombre ya bien codificado no tiene bytes >0x7F fuera de rango latin-1 que
// decodeURIComponent rechace de la misma forma, así que pasa igual.
export function repararMojibake(s: string): string {
  try {
    const reparado = decodeURIComponent(escape(s))
    return reparado
  } catch {
    return s
  }
}

export function serialADate(v: string): Marcable<string | null> {
  const raw = (v ?? '').trim()
  if (!raw) return { valor: null, marcada: true, motivo: 'sinFecha' }

  const serial = Number(raw)
  if (!Number.isFinite(serial)) return { valor: null, marcada: true, motivo: 'sinFecha' }

  // El serial es días desde 1899-12-30 (no 1900-01-01: Excel arrastra el bug del año bisiesto
  // 1900 de Lotus 1-2-3). La fecha se arma en componentes LOCALES desde el vamos —nunca por un
  // `Date.UTC` intermedio— porque construirla en UTC y recién después leerla en hora local
  // corre el día para atrás en cualquier zona horaria negativa (UTC-4: medianoche UTC cae la
  // tarde anterior). `new Date(y, m, d)` interpreta sus componentes en la zona de QUIEN MIRA,
  // así que sumar los días con `setDate` nunca toca UTC.
  const fecha = new Date(1899, 11, 30)
  fecha.setDate(fecha.getDate() + Math.round(serial))
  const valor = localDate(fecha)

  const hoy = localDate()
  if (valor > hoy) return { valor, marcada: true, motivo: 'futura' }

  return { valor, marcada: false }
}

// Deja solo dígitos, después de expandir la notación científica que Excel mete cuando la
// columna se guardó como número ('9.547060773E9' → '9547060773').
function soloDigitos(v: string): string {
  const raw = (v ?? '').trim()
  if (!raw) return ''
  const n = Number(raw)
  if (Number.isFinite(n) && /e/i.test(raw)) {
    return String(Math.trunc(Math.abs(n)))
  }
  return raw.replace(/\D/g, '')
}

function formatearTelefono(digitos10: string): string {
  return `(${digitos10.slice(0, 3)}) ${digitos10.slice(3, 6)}-${digitos10.slice(6)}`
}

export function normalizarTelefono(v: string): Marcable<string | null> {
  const raw = (v ?? '').trim()
  if (!raw) return { valor: null, marcada: false }

  const digitos = soloDigitos(raw)
  if (!digitos) return { valor: null, marcada: false }

  if (digitos.length === 10) {
    return { valor: formatearTelefono(digitos), marcada: false }
  }

  // Solo se saca el 1 si el número EMPIEZA en 1. La regla "11 dígitos, sacar el primero"
  // inventa teléfonos que no existen: tres de los cuatro de 11 dígitos del archivo son un
  // número válido con un cero de más al final, y sacarles el primer dígito da un número que
  // no es de nadie.
  if (digitos.length === 11 && digitos.startsWith('1')) {
    return { valor: formatearTelefono(digitos.slice(1)), marcada: false }
  }

  // Cualquier otra longitud (9, 11 sin empezar en 1, 13, el '0.0'…): se marca, no se arregla.
  return { valor: digitos, marcada: true, motivo: 'telefonoInvalido' }
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y'])

// Title Case respetando partículas ('ardila de delgado' → 'Ardila de Delgado'), salvo que sean
// la primera palabra (nunca empieza en minúscula).
export function normalizarCaja(s: string): string {
  const palabras = (s ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  return palabras
    .map((palabra, i) => {
      if (i > 0 && PARTICULAS.has(palabra)) return palabra
      return palabra.charAt(0).toUpperCase() + palabra.slice(1)
    })
    .join(' ')
}

const ALIAS_GENERO: Record<string, string> = {
  male: 'M',
  female: 'F',
  masculino: 'M',
  femenino: 'F',
  m: 'M',
  f: 'F',
}

// Reusa el resolutor genérico contra el catálogo canónico de género (GENEROS, desde
// GENERO_META). null = no reconocido, para que el import lo pregunte en vez de adivinar.
export function normalizarGenero(v: string): string | null {
  return resolveToCanonical(v ?? '', GENEROS, { aliases: ALIAS_GENERO })
}

// El Chart# de eMedicalPractice es la CLAVE DE IDENTIDAD de esa fuente. Excel lo entrega como
// float ('2.0'); si un parser devolviera '2.0' y otro '2', la misma persona tendría dos claves.
export function normalizarChart(v: string): string {
  return String(Math.trunc(Number(v)))
}
