import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ACTIVE_NOW_KEY } from '../constants'
import type { Presence, RosterUser } from '../types'
import RosterDetails from './index'

const { appModulePath, i18nModulePath } = vi.hoisted(() => ({
  appModulePath: '@/shared/context/AppContext',
  i18nModulePath: '@/shared/i18n',
}))

vi.mock(appModulePath, () => ({ useApp: () => ({ actividades: [] }) }))
vi.mock(i18nModulePath, () => ({ useT: () => ({ t: (key: string) => key }) }))

const MEMBER_EMAIL = 'maricela@eminat.net'
const member: RosterUser = { id: 'roster-member-9', email: MEMBER_EMAIL }
const online: Presence = { hasAccount: true, isOnline: true, status: 'online' }

describe('RosterDetails', () => {
  it('stacks the email line over the footer status', () => {
    const html = renderToStaticMarkup(<RosterDetails user={member} presence={online} />)

    expect(html.indexOf(MEMBER_EMAIL)).toBeLessThan(html.indexOf(ACTIVE_NOW_KEY))
  })
})
