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
export function usePersistedState<T>(key: string | null, initial: T) {
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) setValue(JSON.parse(raw) as T)
    } catch { /* valor corrupto o storage bloqueado: se queda el default */ }
  }, [key])

  // Se escribe dentro del updater y NO en un useEffect sobre `value`: un efecto correría en el
  // primer render y guardaría el default ANTES de que la hidratación leyera lo almacenado,
  // pisando justo la preferencia que queríamos recuperar.
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      if (key) { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* best-effort */ } }
      return v
    })
  }, [key])

  return [value, set] as const
}
