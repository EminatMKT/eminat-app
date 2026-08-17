'use client'
import { useApp } from '@/shared/context/AppContext'
import { usePersistedState } from './usePersistedState'

// Preferencia de UI **por usuario**. localStorage es del navegador, no de la cuenta: sin
// namespacear, en una máquina compartida el que entra segundo hereda los filtros, los tabs y
// los paneles del primero — y en un CRM eso se lee como "me faltan leads", no como "hay un
// filtro puesto". La clave lleva el id del usuario, así cada cuenta guarda lo suyo y nadie
// pierde sus preferencias al alternar sesiones en la misma máquina.
//
// Mientras el perfil carga no hay id: la clave es null (no persiste) y el valor queda en el
// default; cuando llega el usuario la clave cambia y `usePersistedState` rehidrata sola.

// Única fuente del formato de la clave: la usan el hook y quien escriba fuera de React
// (ModuleGate), para que no se desincronicen leyendo y escribiendo claves distintas.
export const userPrefKey = (userId: string, key: string) => `eminat:${userId}:${key}`

// Último módulo visitado. Lo escribe ModuleGate y lo lee el Launchpad para ofrecer el atajo.
export const LAST_MODULE_KEY = 'last-module'

export function useUserPreference<T>(key: string | null, initial: T) {
  const { usuario } = useApp()
  const id = usuario?.id
  return usePersistedState<T>(id && key ? userPrefKey(id, key) : null, initial)
}
