import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RowMenu } from '@/shared/components/ui'
import DuplicateTaskMenu from './index'

// The menu is replaced by a recorder: the test reads its items and fires them without a DOM.
const { menus, setNuevaAct, setModalNuevaAct } = vi.hoisted(() => ({
  menus: new Array<ComponentProps<typeof RowMenu>>(),
  setNuevaAct: vi.fn(),
  setModalNuevaAct: vi.fn(),
}))
vi.mock('@/shared/components/ui', async original => ({
  ...(await original<object>()),
  RowMenu: (props: ComponentProps<typeof RowMenu>) => { menus.push(props); return null },
}))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/features/tasks/components/TasksContext', () => ({ useTasks: () => ({ setNuevaAct, setModalNuevaAct }) }))

describe('DuplicateTaskMenu', () => {
  beforeEach(() => { menus.length = 0; vi.clearAllMocks() })

  it('offers a single duplicate action', () => {
    renderToStaticMarkup(<DuplicateTaskMenu a={{ titulo: 'Post' }} />)
    expect(menus[0].label).toBe('common.actions')
    expect(menus[0].items.map(i => [i.kind, i.label])).toEqual([['duplicate', 'common.duplicate']])
  })

  it('duplicating opens the new-task form prefilled from the task', () => {
    renderToStaticMarkup(<DuplicateTaskMenu a={{ titulo: 'Post' }} />)
    menus[0].items[0].onClick()
    expect(setNuevaAct).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Post' }))
    expect(setModalNuevaAct).toHaveBeenCalledWith(true)
  })
})
