import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ESTADO } from '@/shared/constants/domain'
import { IN_PROGRESS_KEY } from '../constants'
import type { WorkItem } from '../types'
import RosterWorkload from './index'

const { appModulePath, i18nModulePath, board } = vi.hoisted(() => {
  const emptyBoard: { actividades: WorkItem[] } = { actividades: [] }
  const hoisted = {
    appModulePath: '@/shared/context/AppContext',
    i18nModulePath: '@/shared/i18n',
    board: emptyBoard,
  }

  return hoisted
})

vi.mock(appModulePath, () => ({ useApp: () => board }))
vi.mock(i18nModulePath, () => ({ useT: () => ({ t: (key: string) => key }) }))

const MEMBER_ID = 'roster-member-8'
const NOTHING = ''

const ownedBy = (estado: string): WorkItem => ({
  estado,
  responsables: [{ usuario_id: MEMBER_ID, es_lider: false }],
})

const workloadOf = () => renderToStaticMarkup(<RosterWorkload userId={MEMBER_ID} />)

describe('RosterWorkload', () => {
  it('draws nothing when the member has no work in progress', () => {
    board.actividades = [ownedBy(ESTADO.PENDIENTE)]

    expect(workloadOf()).toBe(NOTHING)
  })

  it('shows the in-progress label when the member has work in progress', () => {
    board.actividades = [ownedBy(ESTADO.EN_PROCESO)]

    expect(workloadOf()).toContain(IN_PROGRESS_KEY)
  })
})
