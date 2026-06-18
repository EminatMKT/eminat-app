import { useState } from 'react'
import { DIRECTORIO_DATA } from '@/shared/context/AppContext'
import type { Member } from '../types'

const members: Member[] = DIRECTORIO_DATA

// Estado de búsqueda + filtro por departamento, y la lista resultante.
export function useDirectorioFilter() {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('Todos')

  const filtrados = members.filter(m => {
    if (filtro !== 'Todos' && m.departamento !== filtro) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return m.nombre.toLowerCase().includes(q) || m.cargo.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    }
    return true
  })

  return { busqueda, setBusqueda, filtro, setFiltro, filtrados, total: members.length }
}
