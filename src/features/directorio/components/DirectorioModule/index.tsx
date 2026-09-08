'use client'
import { useState } from 'react'
import { DIRECTORIO_DATA } from '@/shared/context/AppContext'
import { AppShell } from '@/shared/components/shell'
import { ListToolbar } from '@/shared/components/ui'
import { ChipFilter } from '@/shared/components/filters'
import { applyFilters, type FilterValues } from '@/shared/utils'
import { PageTransition, StaggerGrid } from '@/shared/motion'
import MEMBER_FILTERS from '@/features/directorio/utils/filters'
import MemberCard from '../MemberCard'
import s from './index.module.css'

// centinela-exime: familia-dispersa@2 — la familia `*Module` son nueve en nueve directorios
// porque así está partido el repo: un módulo de negocio por feature. Juntarlos sería deshacer
// `src/features/`.

// centinela-exime: bloques-similares@3 — el markup propio son dos `<div>`: el título y la fila de
// departamentos. El resto compone `AppShell`, `ListToolbar`, `ChipFilter` y `StaggerGrid` —
// busqué un encabezado de listado compartido y `ListToolbar` es el que terminó usando.

const [SEARCH, DEPARTMENT] = MEMBER_FILTERS

export default function DirectorioModule() {
  // Los dos criterios en UN estado: se aplican sobre la misma lista y se limpian de una, así que
  // separarlos sólo daba dos formas de dejarlos desincronizados.
  const [values, setValues] = useState<FilterValues>({})
  const set = (key: string, value: string) => setValues(p => ({ ...p, [key]: value }))
  const found = applyFilters(DIRECTORIO_DATA, MEMBER_FILTERS, values)

  return (
    <AppShell>
      <PageTransition>
        <div className={s.titulo}>{DIRECTORIO_DATA.length} Eminat Group members</div>
        <ListToolbar placeholderKey={SEARCH.labelKey}
          busqueda={values[SEARCH.key] ?? ''} setBusqueda={v => set(SEARCH.key, v)}>
          <ChipFilter def={DEPARTMENT} items={DIRECTORIO_DATA} withCount
            value={values[DEPARTMENT.key] ?? ''} onChange={v => set(DEPARTMENT.key, v)} />
        </ListToolbar>
        <StaggerGrid className={s.grilla}>
          {found.map(m => <MemberCard key={m.email} member={m} />)}
        </StaggerGrid>
      </PageTransition>
    </AppShell>
  )
}

// El listado de miembros del grupo: buscador, departamentos y la grilla de tarjetas.
//
// El filtrado ya no es suyo. Vivía en `useDirectorioFilter`, que escribía el predicado a mano —un
// `if` por criterio— sobre `DIRECTORIO_DATA` importado adentro del hook. Ahora los dos criterios
// son un `FilterDef` y el predicado sale de `applyFilters`, el mismo que corre en Tasks y en
// Research; lo que queda acá es de dónde salen los datos y cómo se dibujan.
