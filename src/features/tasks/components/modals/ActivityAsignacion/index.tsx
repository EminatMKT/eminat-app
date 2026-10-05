'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { Field, MultiCombobox, Select } from '@/shared/components/ui'
import { supabase } from '@/shared/db/supabase'
import { TABLES } from '@/shared/data/tables'
import { useT } from '@/shared/i18n'
import { useTasks } from '@/features/tasks/components/TasksContext'
import s from './index.module.css'

type Project = { id: string; name: string; company_code: string }

export default function ActivityAssignment() {
  const { marcas, miembrosAsignables, esAdmin } = useApp()
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useTasks()
  const [projects, setProjects] = useState<Project[]>([])
  const principal = nuevaAct.responsables.find(row => row.es_lider)?.usuario_id || ''
  const collaborators = nuevaAct.responsables.filter(row => !row.es_lider).map(row => row.usuario_id)
  const visibleProjects = projects.filter(project => project.company_code === nuevaAct.empresa)
  const brandOffered = !nuevaAct.empresa || marcas.some(brand => brand.codigo === nuevaAct.empresa)

  useEffect(() => {
    if (!brandOffered) setNuevaAct(previous => ({ ...previous, empresa: '', project_id: '' }))
  }, [brandOffered, setNuevaAct])

  useEffect(() => {
    let active = true
    void supabase.from(TABLES.projects).select('id,name,company_code').order('name').then(({ data }) => {
      if (active) setProjects((data || []) as Project[])
    })
    return () => { active = false }
  }, [])

  return <>
    <div className={s.dos}>
      <Field required icon="🎨" label={t('stratix.new.brand')}>
        <Select value={nuevaAct.empresa} placeholder={t('stratix.new.select')}
          onChange={event => setNuevaAct(previous => ({ ...previous, empresa: event.target.value, project_id: '' }))}>
          {marcas.length === 0 && <option disabled>{t('stratix.new.noBrands')}</option>}
          {marcas.map(brand => <option key={brand.codigo} value={brand.codigo}>{brand.codigo} — {brand.nombre}</option>)}
        </Select>
      </Field>
      <Field icon="📁" label="Project">
        <Select value={nuevaAct.project_id} placeholder={t('stratix.new.select')} disabled={!esAdmin || !nuevaAct.empresa}
          onChange={event => setNuevaAct(previous => ({ ...previous, project_id: event.target.value }))}>
          {visibleProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </Select>
      </Field>
    </div>
    <div className={s.dos}>
      <Field required icon="👤" label="Responsable principal">
        <Select value={principal} placeholder={t('stratix.new.select')}
          onChange={event => setNuevaAct(previous => ({ ...previous, responsables: [
            ...(event.target.value ? [{ usuario_id: event.target.value, es_lider: true }] : []),
            ...previous.responsables.filter(row => !row.es_lider && row.usuario_id !== event.target.value),
          ] }))}>
          {miembrosAsignables.map(member => <option key={member.id} value={member.id}>{member.nombre}</option>)}
        </Select>
      </Field>
      <Field icon="👥" label="Colaboradores">
        <MultiCombobox options={miembrosAsignables.filter(member => member.id !== principal).map(member => ({ id: member.id, label: member.nombre }))}
          selected={collaborators} display={collaborators.length ? `${collaborators.length} colaboradores` : 'Seleccionar colaboradores'}
          searchPlaceholder="Buscar colaboradores"
          empty={() => 'Sin colaboradores disponibles'}
          onToggle={id => setNuevaAct(previous => ({ ...previous, responsables: previous.responsables.some(row => row.usuario_id === id)
            ? previous.responsables.filter(row => row.usuario_id !== id)
            : [...previous.responsables, { usuario_id: id, es_lider: false }] }))} />
      </Field>
    </div>
  </>
}
