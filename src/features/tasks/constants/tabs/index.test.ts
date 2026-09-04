import { describe, it, expect } from 'vitest'
import { TASKS_TABS, TASKS_TAB_PREF } from './index'
import { STRATIX_TABS } from '@/features/stratix-mkt/constants/tabs'
import { SUB_ITEMS } from '@/shared/components/shell/appShellConfig'

describe('catálogo de tabs de /tasks', () => {
  // El sidebar y el catálogo son dos listas que nada obliga a mantener iguales, y no fallan
  // igual: un id que está en el sidebar pero no en el catálogo abre la sección en blanco.
  it('el sidebar ofrece exactamente las tabs del catálogo', () => {
    expect(SUB_ITEMS.tasks.map(i => i.tab)).toEqual([...TASKS_TABS])
  })

  // Los dos módulos ya no comparten ninguna sección: las cuatro de tareas se fueron de Stratix.
  it('no se pisan con las de Stratix', () => {
    expect(TASKS_TABS.filter(t => (STRATIX_TABS as readonly string[]).includes(t))).toEqual([])
  })

  it('son las cuatro secciones de tareas', () => {
    expect([...TASKS_TABS]).toEqual(['overview', 'kanban', 'solicitudes', 'reporte'])
  })

  // La preferencia es POR MÓDULO: si compartieran clave, abrir /tasks en Requests cambiaría
  // la sección con la que abre Stratix.
  it('la clave de preferencia es propia', () => {
    expect(TASKS_TAB_PREF).toBe('tab-tasks')
  })
})
