import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LEADER_KEY, NO_ACCOUNT_KEY } from './constants'
import type { RosterUser } from './types'
import RosterCard from './index'

const { appModulePath, i18nModulePath } = vi.hoisted(() => ({
  appModulePath: '@/shared/context/AppContext',
  i18nModulePath: '@/shared/i18n',
}))

vi.mock(appModulePath, () => ({ useApp: () => ({ actividades: [] }) }))
vi.mock(i18nModulePath, () => ({ useT: () => ({ t: (key: string) => key }) }))

const member: RosterUser = { id: 'roster-member-10', nombre: 'Ximena', apellido: 'Ruales' }
const EXPECTED_NAME = '>Ximena Ruales<'

describe('RosterCard for the leader', () => {
  it('shows the leader badge beside the member identity', () => {
    const html = renderToStaticMarkup(<RosterCard user={member} esLider />)

    expect(html).toContain(LEADER_KEY)
    expect(html).toContain(EXPECTED_NAME)
  })
})

describe('RosterCard for a member without an account', () => {
  it('drops the leader badge and says there is no account yet', () => {
    const html = renderToStaticMarkup(<RosterCard user={member} esLider={false} />)

    expect(html).not.toContain(LEADER_KEY)
    expect(html).toContain(NO_ACCOUNT_KEY)
  })
})
