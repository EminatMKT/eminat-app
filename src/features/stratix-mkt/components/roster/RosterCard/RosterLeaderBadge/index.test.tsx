import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LocaleProvider, translate } from '@/shared/i18n'
import { LEADER_KEY } from '../constants'
import RosterLeaderBadge from './index'

// The provider starts every render in Spanish, the app's default language.
const SPANISH = 'es'

describe('RosterLeaderBadge', () => {
  it('reads the leader label in the default language', () => {
    const expected = translate(SPANISH, LEADER_KEY)
    const badge = <LocaleProvider><RosterLeaderBadge /></LocaleProvider>

    expect(renderToStaticMarkup(badge)).toContain(expected)
  })
})
