'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { AppShell } from '@/shared/components/shell'
import { ListToolbar } from '@/shared/components/ui'
import { applyFilters, type FilterValues } from '@/shared/utils'
import { PageTransition, StaggerGrid } from '@/shared/motion'
import MEMBER_FILTERS from '@/features/directorio/utils/filters'
import type { Member } from '@/features/directorio/types'
import MemberCard from '../MemberCard'
import s from './index.module.css'

const [SEARCH, ...SELECTS] = MEMBER_FILTERS

export default function DirectorioModule() {
  const { usuario } = useApp()
  const [values, setValues] = useState<FilterValues>({})
  const [rows, setRows] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/directory', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('No se pudo cargar Directory')
        return response.json() as Promise<{ members: Member[] }>
      })
      .then(data => { if (active) setRows(data.members) })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Error de carga') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const members = rows.map(member => member.id === usuario?.id
    ? { ...member, avatarKey: usuario.avatar_key || null } : member)
  const found = applyFilters(members, MEMBER_FILTERS, values)
  const set = (key: string, value: string) => setValues(prev => ({ ...prev, [key]: value }))

  return (
    <AppShell>
      <PageTransition>
        <div className={s.titulo}>{members.length} integrantes activos</div>
        <ListToolbar placeholderKey={SEARCH.labelKey}
          busqueda={values[SEARCH.key] ?? ''} setBusqueda={value => set(SEARCH.key, value)}>
          <div className={s.filters}>
            {SELECTS.map(def => <label key={def.key} className={s.filter}>
              <span>{def.key === 'empresa' ? 'Empresa / unidad' : def.key === 'departamento' ? 'Departamento' : 'Cargo'}</span>
              <select value={values[def.key] ?? ''} onChange={event => set(def.key, event.target.value)}>
                <option value="">Todos</option>
                {def.options?.(members).map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>)}
          </div>
        </ListToolbar>
        {error ? <p className={s.empty} role="alert">{error}</p> : loading ? <p>Cargando directorio…</p> : found.length ? (
          <StaggerGrid className={s.grilla}>
            {found.map(member => <MemberCard key={member.id} member={member} />)}
          </StaggerGrid>
        ) : <p className={s.empty}>No hay integrantes que coincidan con la búsqueda.</p>}
      </PageTransition>
    </AppShell>
  )
}
