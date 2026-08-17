'use client'
import { useCallback, useEffect, useState } from 'react'

// Preferencia de UI que sobrevive al recargar (panel recogido, detalle oculto, etc.).
//
// Mismo patrón que `useTheme` del PR #17, a propósito: arranca en el default —que es lo que
// renderiza el servidor, así no hay hydration mismatch— y recién después de montar se hidrata
// desde localStorage. Guardar es best-effort: en modo incógnito o con la cuota llena, `setItem`
// tira y la app sigue andando sin la preferencia.
//
// `key: null` desactiva la persistencia sin cambiar la firma, para componentes que a veces
// quieren recordar y a veces no (los hooks no se pueden llamar condicionalmente).

// Lectura y escritura son funciones puras y EXPORTADAS porque hay un escritor fuera de React
// (ModuleGate). Cuando ese escritor guardaba con `setItem` crudo y el hook leía con `JSON.parse`,
// el valor reventaba al parsear, el catch se lo tragaba y la preferencia no funcionó nunca — sin
// un solo error visible. Una sola pareja read/write evita repetir esa desincronización.
export function writePref(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* best-effort */ }
}

// `isValid` protege de valores que fueron legales y dejaron de serlo: un tab renombrado o un
// módulo retirado quedan guardados igual, y sin validar el módulo renderiza una pantalla vacía
// sin tab activo. Ante cualquier duda (ausente, corrupto, inválido) gana el default.
export function readPref<T>(key: string, fallback: T, isValid?: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (isValid && !isValid(parsed)) return fallback
    return parsed as T
  } catch { return fallback }
}

// Validador para los conjuntos cerrados más comunes (los tabs de cada módulo).
// Devuelve un predicado booleano y no un type guard: el tipo del estado lo fija el caller
// (AppShell espera `(tab: string) => void`), acá lo que hace falta es la validación en runtime.
export const oneOf = (...values: string[]) => (v: unknown): boolean =>
  typeof v === 'string' && values.includes(v)

export function usePersistedState<T>(key: string | null, initial: T, isValid?: (v: unknown) => boolean) {
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    if (!key) return
    setValue(readPref(key, initial, isValid))
    // `initial`/`isValid` quedan fuera de las deps a propósito: son literales recreados en cada
    // render y reejecutarían la hidratación pisando lo que el usuario acabe de elegir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Se escribe dentro del updater y NO en un useEffect sobre `value`: un efecto correría en el
  // primer render y guardaría el default ANTES de que la hidratación leyera lo almacenado,
  // pisando justo la preferencia que queríamos recuperar.
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      if (key) writePref(key, v)
      return v
    })
  }, [key])

  return [value, set] as const
}
