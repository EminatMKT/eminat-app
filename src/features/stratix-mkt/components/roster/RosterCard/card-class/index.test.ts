import { describe, expect, it } from 'vitest'
import type { CardState, Presence } from '../types'
import s from '../index.module.css'
import cardClassOf from './index'

const online: Presence = { hasAccount: true, isOnline: true, status: 'online' }
const unregistered: Presence = { hasAccount: false, isOnline: false, status: 'unregistered' }

describe('cardClassOf for the leader', () => {
  it('adds the leader class and leaves the account slot empty', () => {
    const leader: CardState = { esLider: true, presence: online }
    const expected = `${s.card} ${s.lider} `

    expect(cardClassOf(leader)).toBe(expected)
  })
})

describe('cardClassOf for a member without an account', () => {
  it('leaves the leader slot empty and adds the no-account class', () => {
    const member: CardState = { esLider: false, presence: unregistered }
    const expected = `${s.card}  ${s.sinCuenta}`

    expect(cardClassOf(member)).toBe(expected)
  })
})
