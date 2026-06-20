'use client'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'eminat-theme'

// Estado del tema (claro/oscuro) con persistencia en localStorage.
//
// SSR-safe: arranca en `false` (claro) — que coincide con el render del servidor,
// evitando hydration mismatch — y se hidrata desde localStorage en el primer
// efecto post-montaje. La preferencia se persiste sólo cuando el usuario la
// cambia (setDark), no en cada render.
//
// El default sin preferencia guardada es CLARO a propósito: el modo oscuro aún
// es parcial (research y accounting no consumen los tokens), así que es opt-in
// hasta reconciliar esos módulos. Cuando eso pase, acá se puede respetar
// `prefers-color-scheme`.
export function useTheme() {
  const [dark, setDarkState] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') setDarkState(stored === 'dark')
  }, [])

  const setDark = useCallback((value: boolean) => {
    setDarkState(value)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light')
  }, [])

  return { dark, setDark }
}
