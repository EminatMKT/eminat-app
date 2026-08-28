import { useState } from 'react'
import { DIRECTORIO_DATA } from '@/shared/context/AppContext'
import { SIN_FILTRO } from '@/shared/constants/domain'
import type { Member, DirectorioCriterios } from '@/features/directorio/types'

const members: Member[] = DIRECTORIO_DATA

const SIN_CRITERIOS: DirectorioCriterios = { busqueda: '', departamento: SIN_FILTRO }

// Los criterios del filtrado, y la lista resultante. Búsqueda y departamento son UN estado y no
// dos: se aplican juntos sobre la misma lista y se limpian juntos, así que separarlos sólo daba
// dos formas de dejarlos desincronizados (ver rules/componentes.md).
export function useDirectorioFilter() {
  const [criterios, setCriterios] = useState<DirectorioCriterios>(SIN_CRITERIOS)
  const { busqueda, departamento } = criterios

  const setBusqueda = (valor: string) => setCriterios(p => ({ ...p, busqueda: valor }))
  const setFiltro = (valor: string) => setCriterios(p => ({ ...p, departamento: valor }))
  const limpiar = () => setCriterios(SIN_CRITERIOS)

  const filtrados = members.filter(m => {
    if (departamento !== SIN_FILTRO && m.departamento !== departamento) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return m.nombre.toLowerCase().includes(q) || m.cargo.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    }
    return true
  })

  const resultado = {
    busqueda,
    filtro: departamento,
    setBusqueda,
    setFiltro,
    limpiar,
    filtrados,
    total: members.length,
  }

  return resultado
}
