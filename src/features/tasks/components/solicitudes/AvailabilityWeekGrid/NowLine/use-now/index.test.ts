import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import useNow from '.'

const UNSEEN = 'unseen'

let seen: ReturnType<typeof useNow> | typeof UNSEEN = UNSEEN

function Probe() {
  seen = useNow()

  return null
}

it('reads no time on the server render, so the markup matches before hydration', () => {
  renderToStaticMarkup(createElement(Probe))

  expect(seen).toBeNull()
})
